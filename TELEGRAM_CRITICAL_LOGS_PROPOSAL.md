# Telegram Critical Log Alerts — Review Proposal

Status: **Initial scope implemented — Telegram delivery is disabled by default**  
Project: **Toabapa**  
Prepared: **12 November 2026**

## 1. Purpose

Use a private Telegram chat as a rapid incident-notification channel for events that require human attention. Telegram should complement—not replace—the application logger, database audit log, monitoring, or payment-provider records.

The channel should answer three questions quickly:

1. What failed or changed?
2. What is the likely impact?
3. What should an operator check next?

## 2. Recommended alert levels

### P1 — Send immediately

These events can affect money, vote integrity, account security, or the availability of the platform.

| Event | Trigger | Why it belongs in Telegram | Suggested next action |
|---|---|---|---|
| Payment integrity mismatch | `PAYMENT_AMOUNT_MISMATCH`, `PAYMENT_CURRENCY_MISMATCH`, or `PAYMENT_PROVIDER_MISMATCH` | A provider-confirmed payment does not match the order that would receive votes. | Inspect the order, provider transaction, and webhook log. Do not credit votes manually until reconciled. |
| Webhook processing permanently failed | A valid signed webhook reaches its final retry without being processed | A successful payment may remain without credited votes or ledger entries. | Check `WebhookLog.lastError`, payment status, and the related order. |
| Invalid webhook signature burst | 5 or more invalid signatures in 5 minutes, grouped by source/provider | May indicate a bad provider configuration or an attempt to forge payment callbacks. | Verify the configured webhook secret and review source traffic. |
| Financial reconciliation failed | `Financial ledger reconciliation failed` | Paid transactions may be missing financial ledger entries. | Check database/provider availability and run reconciliation after recovery. |
| Withdrawal processing failed or reversed | Withdrawal changes to `FAILED` or `REVERSED` | Money movement did not complete or was reversed. | Review provider transfer status, withdrawal reference, and reserved ledger entry. |
| High-value withdrawal requested | Amount reaches an approved threshold, recommended initial threshold: **GHS 5,000** | High-value money movement deserves immediate operator visibility even when valid. | Confirm event, recipient, amount, and requesting superadmin. |
| Manual ledger adjustment | `LEDGER_ADJUSTMENT_CREATED` | Directly changes wallet entitlement outside the normal payment flow. | Verify reason, amount, reference, actor, and organization. |
| Superadmin security changed | MFA disabled, recovery phone changed, password reset completed, or session version invalidated | These changes can precede or follow account takeover. | Confirm the action with the account owner and inspect recent sessions/audit events. |
| Privileged access changed | Superadmin/event administrator created, suspended, restored, reassigned, or role changed | Changes who can operate events or financial functions. | Verify the actor and assigned events. |
| Production USSD authentication unavailable | `USSD_AUTH_NOT_CONFIGURED` in production | USSD voting is unavailable or unsafe to accept. | Restore the shared secret/configuration before enabling callbacks. |
| Sustained invalid USSD authentication | 10 or more `INVALID_USSD_SIGNATURE` responses in 5 minutes | May indicate callback misconfiguration or unauthorized callback attempts. | Verify the Arkesel configuration and review source traffic. |
| Database/API critical failure | Database initialization failure, repeated unhandled 500 errors, or process crash/restart loop | The service may be unavailable or unable to record votes/payments. | Check database connectivity, deployment health, and the error fingerprint. |
| Audit retention failed | `Audit log retention failed` | Security records may not be archived or retained as intended. | Check database health and rerun retention after recovery. |

### P2 — Send as a grouped alert

Do not send each occurrence. Aggregate by event type and a short time window.

| Event | Recommended threshold/window | Telegram summary |
|---|---:|---|
| Failed superadmin logins | 5 failures for one account or IP in 10 minutes | Count, masked account identifier, IP fingerprint, first/last occurrence |
| Failed MFA codes | 5 failures for one challenge/account in 10 minutes | Count and masked account identifier |
| Password-reset abuse | 5 requests for one account or 20 from one IP in 15 minutes | Counts and fingerprints; never include OTPs |
| API rate-limit surge | 25 rate-limit responses for one route/IP in 5 minutes | Route, count, IP fingerprint, environment |
| Unhandled server errors | Same error fingerprint 3 times in 5 minutes | Fingerprint, route, count, first/last occurrence |
| Payment failures spike | 10 failed payments for one event in 10 minutes or failure rate above 20% with at least 20 attempts | Event ID/name, count, rate, payment channel |
| USSD vote failures spike | 10 failures for one event/candidate flow in 5 minutes | Event ID, failure code, count; no voter phone numbers |
| Webhook retry backlog | 10 valid, unprocessed webhook logs or oldest pending item exceeds 10 minutes | Pending count and age of oldest item |
| Ledger reconciliation repaired data | One or more missing ledger records were reconstructed | Count only; this is important evidence of an earlier consistency gap |

### P3 — Keep in the audit log/dashboard, not Telegram

The following are useful records but usually do not require interruption:

- Successful ordinary logins and logouts
- Successful vote orders and normal credited votes
- Individual validation errors and malformed requests
- Individual 401, 403, or 404 responses
- Normal rate-limit responses below the aggregation threshold
- Candidate, category, banner, and event-description edits
- Normal event creation, scheduling, or archival
- Successful payment initialization
- Routine worker start/completion messages with no anomaly
- Routine audit-log archive/delete counts
- Health checks and successful request-completion logs

## 3. Existing Toabapa events to reuse

The current code already exposes useful alert sources:

- `backend/server/middleware/error-handler.ts`: unhandled request errors
- `backend/server/workers/webhook-retry.worker.ts`: webhook retry/worker failures
- `backend/server/workers/financial-reconciliation.worker.ts`: reconciliation failures and repaired-entry counts
- `backend/server/workers/audit-retention.worker.ts`: retention failures
- `backend/server/routes/webhook.routes.ts`: webhook signature and processing results
- `backend/server/routes/ussd.routes.ts`: missing/invalid USSD callback authentication
- `backend/server/services/vote-credit.service.ts`: payment provider, amount, and currency mismatches
- `backend/server/routes/financial.routes.ts`: withdrawals and ledger adjustments
- `AuditLog`: privileged actions, actor, resource, IP address, and timestamp

Some recommended events, particularly repeated authentication failures and MFA/recovery-phone changes, will need explicit security-event instrumentation because normal `AppError` responses are intentionally not written as error logs.

## 4. Telegram message format

Recommended compact format:

```text
🔴 P1 · PAYMENT INTEGRITY MISMATCH
Environment: production
Time: 2026-11-12T14:32:10Z
Event: evt_…c91a · Ghana Awards
Reference: …8F4C21
Code: PAYMENT_AMOUNT_MISMATCH
Expected: GHS 50.00
Received: GHS 5.00
Occurrence: 1
Action: Hold vote credit and inspect payment + order.
Correlation: req_…2d91
```

Every message should include:

- Severity (`P1` or `P2`)
- Stable event name/code
- Environment
- UTC timestamp
- Organization/event/resource identifiers when relevant
- Sanitized error fingerprint or application error code
- Occurrence count for grouped alerts
- Short operator action
- Correlation/request ID

## 5. Data that must never be sent to Telegram

Telegram is a third-party notification channel. Do not send:

- Passwords or password hashes
- OTPs, password-reset codes, or MFA challenge values
- Session cookies, authorization headers, JWTs, or API keys
- Telegram bot token or chat ID
- Paystack/Arkesel secrets, signatures, or raw callback payloads
- Full phone numbers, voter emails, or payout account numbers
- Full provider checkout URLs
- Complete request bodies
- Raw database connection strings
- Full stack traces in production messages
- Audit-log `oldValue`/`newValue` objects without an explicit safe-field allowlist

Use masked values only:

- Phone/account: last 4 digits at most
- Email: partially mask the local part
- Payment/withdrawal reference: last 6 characters, while retaining the full reference internally
- IP address: send a keyed fingerprint or masked subnet; retain the full IP only in the internal audit log
- Error: send a stable fingerprint plus a sanitized message; retain the stack trace in local logging

## 6. Noise-control policy

Telegram alerts become useless if they are noisy. The sender should provide:

- **Deduplication:** group identical alerts using `eventCode + resourceId + errorFingerprint`
- **Cooldown:** one message per fingerprint every 5 minutes
- **Aggregation:** update the occurrence count instead of sending every repetition
- **Recovery message:** send one green recovery notification after a P1 condition clears
- **Environment filtering:** production enabled by default; development/test disabled unless explicitly opted in
- **Threshold configuration:** financial amount and count thresholds must be environment variables, not hard-coded policy
- **Daily cap:** recommended maximum of 100 Telegram messages per environment, with one local warning when capped

## 7. Delivery safety requirements

The alerting path must never delay or break voting, payment handling, USSD responses, or withdrawals.

- Send asynchronously through an internal queue/outbox.
- Never `await` Telegram delivery inside a payment/webhook database transaction.
- Use a short HTTP timeout, recommended 2–3 seconds.
- Retry with bounded exponential backoff and a maximum attempt count.
- Add a circuit breaker after repeated Telegram failures.
- Log Telegram-delivery failures locally without recursively sending another Telegram alert.
- Store no alert payload longer than required for retry.
- Escape Telegram Markdown/HTML before sending.
- Use an allowlisted private chat/channel ID; do not accept inbound bot commands in the first version.
- Load `TELEGRAM_BOT_TOKEN` through a secret or `TELEGRAM_BOT_TOKEN_FILE`; never commit it.

## 8. Proposed configuration

```dotenv
TELEGRAM_ALERTS_ENABLED=false
TELEGRAM_BOT_TOKEN_FILE=/run/secrets/toabapa_telegram_bot_token
TELEGRAM_CHAT_ID=
TELEGRAM_MIN_SEVERITY=P1
TELEGRAM_HIGH_VALUE_WITHDRAWAL_GHS=5000
TELEGRAM_ALERT_COOLDOWN_SECONDS=300
TELEGRAM_ALERT_DAILY_LIMIT=100
```

`TELEGRAM_BOT_TOKEN` may be supported for local development, but the file-based secret should be preferred in production.

## 9. Recommended first implementation scope

Start with these six alerts because they have the clearest operational value and lowest noise:

1. Payment amount/currency/provider mismatch
2. Valid webhook permanently failing after retries
3. Financial reconciliation failure
4. Withdrawal failed/reversed or above the configured high-value threshold
5. Manual ledger adjustment
6. Repeated unhandled server error fingerprint

Grouped failed-login alerts are now implemented at five failures per account/IP fingerprint within the configured cooldown window. Add the remaining USSD, rate-limit, and payment-failure alerts after observing production thresholds.

## 10. Review decisions required before implementation

- [ ] Confirm the private Telegram chat/channel that will receive alerts
- [ ] Confirm who is allowed to join that chat/channel
- [ ] Approve or change the proposed **GHS 5,000** high-value withdrawal threshold
- [ ] Decide whether P2 grouped alerts should go to the same chat or a separate operations chat
- [ ] Confirm whether masked IP information may leave the platform for Telegram
- [ ] Confirm production-only delivery or opt in selected staging environments
- [ ] Approve the six-alert initial scope in Section 9

## 11. Acceptance criteria for the later implementation

- A Telegram outage cannot fail or slow an application request.
- Secrets and personal data are excluded through an explicit allowlist serializer.
- Duplicate incidents are grouped and rate-limited.
- Alerts include enough internal identifiers to investigate without exposing sensitive values.
- P1 alert and recovery delivery are covered by automated tests using a fake local Telegram transport.
- The feature is disabled by default and requires explicit production configuration.
- A local audit record is retained even when Telegram delivery fails.

