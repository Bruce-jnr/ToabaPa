# Telegram Bot Integration Guide

Status: **Implemented — delivery remains disabled until `TELEGRAM_ALERTS_ENABLED=true`**  
Project: **Toabapa**  
Prepared: **12 November 2026**  
Companion policy: [`TELEGRAM_CRITICAL_LOGS_PROPOSAL.md`](./TELEGRAM_CRITICAL_LOGS_PROPOSAL.md)

## 1. Recommended design

Build the first version as an **outbound-only incident notifier**:

```text
Application event
      │
      ▼
Safe alert serializer ── rejects fields not on the allowlist
      │
      ▼
Durable alert outbox ── deduplicates and survives process restarts
      │
      ▼
Telegram alert worker ── timeout, retry, rate limit, circuit breaker
      │
      ▼
Private Telegram group/channel
```

The bot should send alerts but should not accept Telegram commands, approve withdrawals, change events, or expose application data. Administrative actions must remain inside Toabapa with its existing authentication and audit controls.

## 2. Telegram account setup

### 2.1 Create the bot

1. Open Telegram and start a chat with the official **@BotFather** account.
2. Send `/newbot`.
3. Choose a display name, for example `Toabapa Production Alerts`.
4. Choose a unique username ending in `bot`, for example `toabapa_prod_alerts_bot`.
5. BotFather will provide an authentication token.
6. Store the token immediately in a secret manager or protected secret file. Do not paste it into source code, `.env.example`, tickets, screenshots, or Telegram messages.
7. Use BotFather to disable unnecessary bot features and commands. The first release needs only outbound message delivery.

Telegram documents bot creation through BotFather and token-based HTTPS authentication in its [official bot introduction](https://core.telegram.org/bots) and [Bot API documentation](https://core.telegram.org/bots/api).

### 2.2 Create the alert destination

Recommended setup:

1. Create a private Telegram group named `Toabapa Production Alerts`.
2. Add only trusted operators.
3. Add the bot to the group.
4. Do not grant administrator permissions unless Telegram requires a specific permission for the selected destination. Sending ordinary group messages does not justify broad administrative access.
5. Send one test message in the group so Telegram creates an update containing the group chat identifier.

For stricter separation, use two private destinations:

- **P1 incidents:** immediate financial, vote-integrity, security, and availability alerts
- **P2 operations:** grouped failure-rate and abuse-threshold alerts

### 2.3 Obtain and verify the chat ID

For initial setup only:

1. Send a message to the bot or in the private alert group.
2. Call Telegram's `getUpdates` method from a trusted administrator workstation.
3. Read `result[].message.chat.id` or `result[].channel_post.chat.id`.
4. Store that identifier as `TELEGRAM_CHAT_ID`.
5. Send a test message with `sendMessage` and confirm it arrives in the intended private destination.
6. Remove any temporary output containing the token or chat metadata.

Do not print the complete request URL because the Telegram token forms part of the API URL. Telegram supports `getUpdates` for long polling and `sendMessage` for delivery; the two supported update modes, long polling and webhooks, are mutually exclusive according to the [official Bot API](https://core.telegram.org/bots/api#getting-updates).

The production Toabapa service does **not** need `getUpdates` after setup because this design accepts no inbound bot commands.

## 3. Environment configuration

Add these fields to `backend/server/config/env.ts`:

```dotenv
TELEGRAM_ALERTS_ENABLED=false
TELEGRAM_BOT_TOKEN_FILE=/run/secrets/toabapa_telegram_bot_token
TELEGRAM_CHAT_ID=
TELEGRAM_P2_CHAT_ID=
TELEGRAM_MIN_SEVERITY=P1
TELEGRAM_HIGH_VALUE_WITHDRAWAL_GHS=5000
TELEGRAM_ALERT_COOLDOWN_SECONDS=300
TELEGRAM_ALERT_DAILY_LIMIT=100
TELEGRAM_REQUEST_TIMEOUT_MS=2500
TELEGRAM_MAX_DELIVERY_ATTEMPTS=5
```

Recommended validation rules:

- `TELEGRAM_ALERTS_ENABLED`: boolean, default `false`
- `TELEGRAM_BOT_TOKEN`: optional non-empty secret for development only
- `TELEGRAM_BOT_TOKEN_FILE`: preferred production secret source
- `TELEGRAM_CHAT_ID`: signed integer/string, required only when alerts are enabled
- `TELEGRAM_P2_CHAT_ID`: optional; fall back to the P1 destination when omitted
- `TELEGRAM_MIN_SEVERITY`: `P1` or `P2`
- Withdrawal threshold: positive integer in pesewas internally, even if configured/displayed in GHS
- Cooldown: recommended range 60–3,600 seconds
- Timeout: recommended range 1,000–5,000 milliseconds
- Daily limit: recommended range 10–1,000 messages

Follow the existing `*_FILE` secret-loading pattern already used by `SESSION_SECRET`, Paystack, and Arkesel. Never put the real token in `.env.example`.

Production startup should fail closed when `TELEGRAM_ALERTS_ENABLED=true` but the token or P1 chat ID is missing. Telegram being disabled must not stop the API.

## 4. Proposed source structure

```text
backend/server/alerts/
├── alert.types.ts
├── alert-policy.ts
├── alert-redaction.ts
├── alert-outbox.service.ts
├── telegram.transport.ts
└── telegram-alert.worker.ts
```

### File responsibilities

#### `alert.types.ts`

Defines a small, typed event contract:

```ts
type AlertSeverity = 'P1' | 'P2';

type SecurityAlert = {
  code: string;
  severity: AlertSeverity;
  title: string;
  occurredAt: Date;
  environment: string;
  organizationId?: string;
  eventId?: string;
  resourceType?: string;
  resourceId?: string;
  correlationId?: string;
  safeDetails: Record<string, string | number | boolean | null>;
  operatorAction: string;
};
```

No arbitrary error object, request body, database entity, or audit JSON should be accepted by this contract.

#### `alert-policy.ts`

Maps application events to:

- Severity
- Threshold/window
- Deduplication key
- Cooldown
- Telegram destination
- Operator instruction

Keep policy separate from delivery so thresholds can change without touching Telegram transport code.

#### `alert-redaction.ts`

Builds the final safe payload through an explicit field allowlist. It should provide:

- `maskPhone(value)` → last four digits only
- `maskEmail(value)` → partially masked local part
- `maskReference(value)` → last six characters
- `fingerprintIp(value, secret)` → keyed, stable fingerprint
- `fingerprintError(error)` → stable name/message/top-frame hash
- Telegram Markdown/HTML escaping
- Maximum field and message lengths

The serializer should reject unknown fields rather than attempting to remove known secrets after the fact.

#### `alert-outbox.service.ts`

Creates deduplicated alert records and increments grouped occurrences. Application routes/services should enqueue a typed alert and continue; they must not contact Telegram directly.

#### `telegram.transport.ts`

The only module allowed to know the bot token. It calls:

```text
POST https://api.telegram.org/bot<TOKEN>/sendMessage
Content-Type: application/json
```

Body:

```json
{
  "chat_id": "<configured-chat-id>",
  "text": "<escaped-alert-message>",
  "disable_web_page_preview": true
}
```

Telegram's `sendMessage` method accepts text messages up to 4,096 characters after entity parsing. Toabapa alerts should stay below approximately 2,500 characters so grouped counts and recovery information can be added safely. See the official [`sendMessage` documentation](https://core.telegram.org/bots/api#sendmessage).

Use the platform `fetch` implementation; a Telegram SDK is unnecessary for an outbound-only integration.

#### `telegram-alert.worker.ts`

Polls the outbox, claims messages atomically, sends them, and records delivery state. Follow the same single-run guard pattern used by the existing webhook, reconciliation, and retention workers.

## 5. Durable outbox model

Add a Prisma model similar to:

```prisma
enum AlertDeliveryStatus {
  PENDING
  PROCESSING
  DELIVERED
  FAILED
  SUPPRESSED
}

model AlertOutbox {
  id              String              @id @default(cuid())
  eventCode       String
  severity        String
  dedupeKey       String
  destination     String
  safePayload     Json
  occurrenceCount Int                 @default(1)
  status          AlertDeliveryStatus @default(PENDING)
  attempts        Int                 @default(0)
  nextAttemptAt   DateTime            @default(now())
  lastErrorCode   String?
  deliveredAt     DateTime?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([status, nextAttemptAt])
  @@index([dedupeKey, createdAt])
}
```

Do not store the bot token, raw stack traces, full request bodies, phone numbers, account numbers, OTPs, provider payloads, authorization data, or cookie values in `safePayload`.

### Transaction rule

For financial and vote-integrity events, create the outbox record inside the same database transaction that records the business state whenever practical. Delivery occurs later, outside the transaction.

For failures caused by the database itself, the outbox may be unavailable. Those errors may use a bounded best-effort direct sender after the request/process has already failed, while still retaining the normal local error log. This fallback must never recursively alert about its own failure.

## 6. Delivery algorithm

Recommended worker behavior:

1. Select up to 20 `PENDING`/retryable records with `nextAttemptAt <= now`.
2. Atomically claim each record by changing it to `PROCESSING` only when its current state and attempt count still match.
3. Build the message from the already-sanitized payload.
4. Send using `AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS)` or an equivalent abort controller.
5. Treat Telegram `ok: true` as success and mark the record `DELIVERED`.
6. For HTTP 429, honor Telegram's retry information when supplied and reschedule without a tight retry loop.
7. For network errors and 5xx responses, retry with capped exponential backoff and jitter.
8. For invalid token/chat errors, mark the record `FAILED`, open the circuit breaker, and log one local configuration error.
9. Stop after the configured maximum attempts.
10. Never enqueue a Telegram alert about Telegram delivery failure.

Suggested retry schedule:

```text
Attempt 1: immediately
Attempt 2: +30 seconds
Attempt 3: +2 minutes
Attempt 4: +10 minutes
Attempt 5: +30 minutes
```

## 7. Deduplication and aggregation

Build a stable key:

```text
SHA-256(eventCode | environment | organizationId | resourceId | errorFingerprint)
```

Within the configured cooldown window:

- Increment `occurrenceCount`
- Update the last occurrence timestamp
- Do not create another Telegram message immediately
- Send the grouped count when the cooldown expires or a higher severity is reached

Examples:

- One invalid webhook signature: retain internally
- Five invalid signatures in five minutes: one P1/P2 Telegram alert, based on approved policy
- Fifty identical server errors: one grouped alert with count 50, not fifty Telegram messages

## 8. Initial alert integration points

Implement the first six approved events from the companion policy.

### 8.1 Payment integrity mismatch

File: `backend/server/services/vote-credit.service.ts`

Enqueue before returning these errors:

- `PAYMENT_PROVIDER_MISMATCH`
- `PAYMENT_AMOUNT_MISMATCH`
- `PAYMENT_CURRENCY_MISMATCH`

Safe fields: masked payment reference, expected/received amount and currency, event ID, provider name, correlation ID.

### 8.2 Webhook permanently failed

Files:

- `backend/server/services/webhook-processing.service.ts`
- `backend/server/workers/webhook-retry.worker.ts`

Alert only after the final allowed processing attempt for a webhook with a valid signature. Do not alert on every retry.

### 8.3 Financial reconciliation failed

File: `backend/server/workers/financial-reconciliation.worker.ts`

Enqueue/send a P1 alert when the worker fails. When missing ledger entries are successfully reconstructed, send one grouped P2 anomaly/recovery message containing only the count.

### 8.4 Withdrawal event

Files:

- `backend/server/routes/financial.routes.ts`
- `backend/server/services/webhook-processing.service.ts`

Alert when:

- Requested amount meets the configured threshold
- Processing fails
- Provider reports failure or reversal

Safe fields: withdrawal ID, masked reference, amount/currency, event ID, masked payout destination, actor ID. Never send the full account number or recipient code.

### 8.5 Manual ledger adjustment

File: `backend/server/routes/financial.routes.ts`

Enqueue in the same transaction as `LEDGER_ADJUSTMENT_CREATED`. Include amount, masked reference, reason truncated to a safe length, actor ID, organization ID, and audit record/resource ID.

### 8.6 Repeated unhandled server errors

File: `backend/server/middleware/error-handler.ts`

Continue writing the complete error to the redacted local logger. Send only an error fingerprint, route template/path, request method, occurrence count, environment, and correlation ID to Telegram after the threshold is met.

## 9. Message rendering

Example:

```text
🔴 P1 · PAYMENT INTEGRITY MISMATCH

Environment: production
Time: 2026-11-12T14:32:10Z
Code: PAYMENT_AMOUNT_MISMATCH
Event: evt_…c91a
Reference: …8F4C21
Expected: GHS 50.00
Received: GHS 5.00
Occurrences: 1

Action: Hold vote credit and inspect the payment and order.
Correlation: req_…2d91
```

Use a small fixed set of severity symbols:

- `🔴 P1` immediate action
- `🟠 P2` grouped operational/security anomaly
- `🟢 RECOVERED` previously alerted condition resolved

Avoid decorative formatting, large payloads, or links containing secrets.

## 10. Security requirements

- The transport accepts only the sanitized `SecurityAlert` contract.
- The Telegram token is read only inside `telegram.transport.ts`.
- Pino redaction must include `TELEGRAM_BOT_TOKEN` and any nested `botToken` field.
- Never log the full Telegram API URL because it contains the token.
- Never expose the token through health/readiness endpoints.
- Operators must be removed promptly from the private Telegram group when access changes.
- Rotate the bot token if it appears in logs, shell history, screenshots, commits, CI output, or chat.
- Keep the bot outbound-only in version one.
- If inbound webhooks are introduced later, use Telegram's `secret_token`, validate the `X-Telegram-Bot-Api-Secret-Token` header, enforce a strict body limit, rate-limit the endpoint, and allowlist commands. Telegram documents this header in [`setWebhook`](https://core.telegram.org/bots/api#setwebhook).

## 11. Testing plan

### Unit tests

- Every alert type renders the expected safe fields.
- Unknown fields are rejected.
- Tokens, passwords, OTPs, full phones, emails, account numbers, cookies, and authorization headers never appear.
- Telegram Markdown/HTML control characters are escaped.
- References, email addresses, phones, and IPs are masked/fingerprinted correctly.
- Deduplication keys are stable.
- Severity and threshold policies map correctly.
- Messages stay below the chosen size limit.

### Worker tests

- Successful delivery marks the outbox item delivered.
- Timeouts and 5xx responses reschedule with backoff.
- HTTP 429 respects retry timing.
- Permanent configuration errors open the circuit breaker.
- Maximum attempts result in `FAILED`.
- Concurrent workers cannot deliver the same record twice.
- Telegram failure does not create another Telegram alert.

### Integration tests

Use a fake loopback HTTP server as the Telegram transport target. Do not call the real Telegram API during automated tests.

Verify:

- Payment mismatch creates one sanitized outbox event.
- Final webhook failure creates one event, not one per retry.
- Financial transaction commits even when Telegram is unavailable.
- High-value withdrawal threshold behaves at below/equal/above boundaries.
- Manual ledger adjustment and alert outbox record commit atomically.
- Alerts disabled means no delivery attempt and no application failure.

### Manual staging test

1. Use a separate staging bot and private staging chat.
2. Enable alerts only in staging.
3. Trigger a synthetic non-financial test alert.
4. Confirm formatting, masking, chat destination, and timestamp.
5. Simulate timeout, 429, and invalid chat configuration.
6. Verify the API remains responsive and no secrets appear in logs.
7. Disable the staging feature after validation.

## 12. Deployment sequence

1. Review and approve `TELEGRAM_CRITICAL_LOGS_PROPOSAL.md`.
2. Create separate staging and production bots.
3. Create private staging and production alert destinations.
4. Add the Prisma outbox migration.
5. Deploy the code with `TELEGRAM_ALERTS_ENABLED=false`.
6. Apply the database migration.
7. Configure the staging token/chat ID through secrets.
8. Enable staging and complete the manual test plan.
9. Configure production secrets without enabling delivery.
10. Send one explicit production test alert during a planned window.
11. Enable only the six initial P1/P2 alert types.
12. Review noise, usefulness, and failures daily for the first week.
13. Add grouped authentication/USSD alerts only after thresholds are approved.

## 13. Monitoring the notifier

Expose internal metrics without exposing message contents:

- Pending outbox count
- Oldest pending alert age
- Delivered/failed/suppressed totals
- Telegram latency histogram
- HTTP 429 count
- Circuit-breaker state
- Daily message count and cap state

Readiness should not fail solely because Telegram is unavailable. A growing outbox or open circuit should appear in operational monitoring and local error logs.

## 14. Rollback

Emergency disable:

```dotenv
TELEGRAM_ALERTS_ENABLED=false
```

Then restart/redeploy the API. Disabling alerts should stop delivery while preserving pending outbox records for investigation. Do not delete queued records automatically.

If the token is compromised:

1. Revoke/regenerate it with BotFather immediately.
2. Disable Telegram alerts.
3. Replace the stored secret.
4. Search logs, CI output, commits, tickets, and chat for exposure.
5. Remove unauthorized members from the destination.
6. Re-enable only after a test message succeeds.

## 15. Implementation checklist

- [ ] Approve the alert policy and thresholds
- [ ] Create staging and production bots
- [ ] Create private alert destinations and operator membership policy
- [x] Add validated environment configuration
- [x] Add Prisma `AlertOutbox` model and migration
- [x] Implement typed alert contract and allowlist serializer
- [x] Implement masking, fingerprinting, and bounded plain-text messages
- [x] Implement outbox enqueue/deduplication service
- [x] Implement bounded Telegram transport
- [x] Implement worker claim, retry, daily cap, and circuit breaker
- [x] Add the six initial integration points
- [x] Add grouped failed-login alerts using keyed account/IP fingerprints
- [x] Add redaction and message-rendering unit tests
- [ ] Complete live staging delivery tests
- [ ] Deploy disabled, migrate, test staging, then enable production
- [ ] Review alert usefulness after one week

