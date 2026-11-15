# Simulate Toabapa USSD with USSD Playground

This guide tests the NALO callback adapter without a live shortcode. USSD Playground supports a Nalo provider format and a phone emulator. Its public guide describes project setup, endpoint configuration, session modes, and request/response logs: [USSD Playground help](https://www.ussdplayground.com/help), [testing guide](https://www.ussdplayground.com/blog/ussd-simulator-testing-guide).

## 1. Prepare a safe test environment

1. Start the API and PostgreSQL with a test database. Ensure the database has at least one **active** event whose start/end times include now, USSD voting enabled, and an active category and candidate. Copy that candidate's code.
2. Set `NALO_USSD_SECRET` in the API's `.env` to a random value of at least 24 characters. Restart the API after changing it. Keep `PAYSTACK_SECRET_KEY` on a **test** key.
3. Make the API reachable from USSD Playground. `http://localhost:4000` is only reachable on your computer; use a temporary HTTPS tunnel or staging API. The callback is `/api/v1/ussd/nalo`.
4. Use a disposable callback secret for this test. If the simulator cannot send a custom `x-nalo-secret` or Bearer header, append `?token=YOUR_TEST_SECRET` to the callback URL. Do not put a production secret into a third-party project or its request logs. Rotate the test secret after testing.

## 2. Create the simulator project

1. Sign in at [ussdplayground.com](https://www.ussdplayground.com/), then create a project.
2. Set its endpoint to `https://YOUR-TUNNEL-OR-STAGING-HOST/api/v1/ussd/nalo?token=YOUR_TEST_SECRET` (or omit the query token if custom headers are available).
3. Select **Nalo** as the gateway/provider format, **POST**, and JSON if those settings are offered. Set `Content-Type: application/json`. Playground's preset may differ from NALO's published callback contract; verify its actual request in the session log before proceeding.
4. Enter a test dial code such as `*920#`; it identifies the simulator project and is not used by this callback.
5. Choose **Explicit** session mode if the UI offers it. Toabapa expects an initial-request flag followed by individual inputs. If the Nalo template supplies this automatically, use its default and check the first request in the logs.
6. Set a Ghana test MSISDN in `233XXXXXXXXX` format and select a supported network such as **MTN**. Use a Paystack-approved test number if you intend to exercise the final payment step.
7. Save the project.

## 3. Check the first callback

Dial the test code in the phone emulator. In the request log, confirm a JSON POST resembling:

```json
{
  "SESSIONID": "test-session-1",
  "USERID": "your-nalo-user-id",
  "MSISDN": "233551234987",
  "USERDATA": "",
  "MSGTYPE": true,
  "NETWORK": "MTN"
}
```

`SESSIONID` and `USERID` can have other values. The important parts are uppercase field names, a boolean `MSGTYPE` (`true` for the first request), and a nonempty `NETWORK`. The API should return HTTP 200 with `MSG` containing `Welcome to Toabapa` and `MSGTYPE: true`.

If the Nalo preset sends different names or omits fields, use Playground's **Custom Gateway Builder** to map `sessionId → SESSIONID`, a fixed NALO integration ID → `USERID`, `phoneNumber → MSISDN`, `userInput → USERDATA`, `isNewSession → MSGTYPE`, and `networkCode → NETWORK`. Map response message to `MSG` and the continue flag to `MSGTYPE`. Its [builder guide](https://www.ussdplayground.com/blog/custom-gateway-builder-guide) describes those source variables and mappings. Ensure `SESSIONID` is a nonempty string reused across steps, `NETWORK` is a supported name such as `MTN`, and the first request's `MSGTYPE` is a JSON boolean, not the string `"true"`. Do not substitute the dial code for `SESSIONID` or omit `NETWORK` merely because the menu can display without it; payment provider selection needs the network.

### If the emulator displays `CON undefined`

The request is now valid, but Playground is reading the response with the wrong parser. Toabapa returns JSON like `{ "MSG": "Welcome to Toabapa...", "MSGTYPE": true }`, not plain text beginning with `CON` or `END`.

In the Custom Gateway Builder's **Response** settings, select **JSON**, set **Message Path** to `MSG`, and use **field-based** session control with **Field Path** `MSGTYPE` and **End Value** `false` (the JSON boolean). Save and start a fresh session. The screen should display the value of `MSG`; a response with `MSGTYPE: false` should close the session. If the Nalo preset does not allow response parsing changes, switch the project to **Custom** format and keep the request mappings above. Playground's [builder documentation](https://www.ussdplayground.com/blog/custom-gateway-builder-guide) describes message paths and field-based session control.

## 4. Walk through a vote

Keep the same session, phone, user ID, and network for each input. Subsequent requests must carry `MSGTYPE: false`.

| Input | Expected screen |
| --- | --- |
| `1` | `Enter nominee code:` |
| Your active candidate code | Candidate and category name; asks for number of votes |
| A valid quantity (at least the event minimum) | Vote count and total; `1. Accept`, `2. Cancel` |
| `2` | `Vote cancelled.` and response `MSGTYPE: false` |

Run a second session to test acceptance. Enter `1` at the final screen only with a Paystack test key and test phone; this starts a mobile-money charge. The simulator alone cannot approve a real Mobile Money prompt or prove that votes were credited. Credit should occur only after Paystack confirms payment.

## 5. Inspect failures and logs

- `401`: callback token/header does not match `NALO_USSD_SECRET`.
- `503`: the USSD callback secret is missing in production.
- `400`: check field casing, JSON booleans, phone format, and `NETWORK`.
- `Session expired`: more than two minutes passed between inputs, or the session ID changed.
- `Session details changed`: phone, user ID, or network changed mid-session.
- `Nominee code is not valid for a live event`: check event dates/status, USSD enabled, and candidate/category status.
- `429`: the callback's current gateway IP limit is 60 requests per minute; avoid shared load testing through the public simulator.

Open Playground's request/response log after each screen. Verify the response JSON has `USERID`, `MSISDN`, `USERDATA`, `MSG`, and boolean `MSGTYPE`. Toabapa also echoes `SESSIONID`.

The NALO [published callback specification](https://documenter.getpostman.com/view/7705958/UyrEhaLQ) defines this JSON contract. A successful Playground run verifies the adapter and menus; it does not verify NALO's live gateway authentication, retries, network identifiers, or Paystack settlement. Confirm those separately before moving a live shortcode.
