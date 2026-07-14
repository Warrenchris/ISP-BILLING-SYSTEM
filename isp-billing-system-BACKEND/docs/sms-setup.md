# Smart Dunning & SMS Setup Guide — ISP Billing System Phase 3

This document details the configuration, deployment, and operational parameters for the outbound SMS message queue and dunning scheduler introduced in Phase 3.

---

## 1. SMS Queue & Routing Architecture

To protect core billing performance (like M-Pesa callbacks) from API latency, the system processes all SMS notifications asynchronously using a dedicated BullMQ queue (`sms`).

```
    [Outbound Trigger]
    (Receipt, Warning, Cutoff)
            |
            v
     +--------------+
     |   smsQueue   |  (Pushed to Redis with dedup jobId)
     +--------------+
            |
            | (Attempts: 3, Exponential backoff: 10s)
            v
     +--------------+
     |  smsWorker   |  (Pulls job, interpolates template, formats phone)
     +--------------+
            |
            +------------> [Mock Provider] (If dev/testing, cost = 0)
            |
            +------------> [Africa's Talking] (Production REST API)
                                    |
                                    +--> Parses actual Cost & Status
                                    +--> Writes to sms_logs table
```

---

## 2. API Configuration (Africa's Talking)

To connect the system to the Africa's Talking gateway, update your primary `.env` file at the project root with the following parameters:

```ini
# Provider setting (africastalking | advanta | mock)
SMS_PROVIDER=africastalking

# Africa's Talking Credentials
AT_USERNAME=sandbox # Use 'sandbox' for dev/testing, or your real username for production
AT_API_KEY=YOUR_AFRICAS_TALKING_API_KEY
AT_SENDER_ID=MY_ISP # Optional: Alphanumeric sender ID registered with Safaricom/Uganda telecoms
```

### Rate-Limiter Settings
The worker is pre-configured with a concurrency limit of `2` and a rate limit of **`10 jobs per second`** (configured inside `smsWorker.js`). This matches Africa's Talking API limits for sandbox and standard accounts to prevent gateway spamming or API blocks.

---

## 3. Country-Aware Phone Normalization

Outbound SMS delivery requires international formatting (E.164). The formatter normalizes standard mobile phone numbers dynamically:

- **Kenya**: Converts standard numbers starting with `07...` or `01...` to `+2547...` / `+2541...`.
- **Uganda**: Converts standard numbers starting with `07...` to `+2567...` if `DEFAULT_COUNTRY_CODE=256` is configured.
- **E.164 Preserves**: Already formatted numbers starting with `+` are left intact.

Configure the default market country code in `.env`:
```ini
DEFAULT_COUNTRY_CODE=254 # 254 for Kenya, 256 for Uganda
```

---

## 4. Database-Backed Templates

SMS text patterns are stored in the `sms_templates` table. This allows administrators to edit templates via a dashboard without redeploying code.

### Placeholders Interpolation
Variables are wrapped in `{{variable}}` double-brackets. Standard seeded templates include:

| Key | Purpose | Variables |
|-----|---------|-----------|
| `payment_receipt` | Receipt sent on payment success | `firstName`, `amount`, `plan`, `endDate` |
| `expiry_warning` | Warning alert sent before cutoff | `firstName`, `plan`, `hours`, `endDate`, `subscriptionNumber` |
| `disconnection_notice` | Sent right after router cutoff | `firstName`, `subscriptionNumber`, `amount` |
| `voucher_delivery` | Delivers remotely purchased voucher | `code`, `plan`, `dataLimit`, `validity` |

---

## 5. Dunning Scheduler & Anti-Fatigue Measures

Pre-expiry warnings are managed by the dunning sweep scheduler (`src/jobs/sendSmsReminders.js`).

### Cycle Warning Clears
- **Hourly Sweeps**: Runs hourly (`DUNNING_CHECK_CRON=0 * * * *`) querying users expiring in `< 24 hours` (`SMS_DUNNING_WINDOW_HOURS`).
- **Billing Cycle Reset**: To avoid spamming, the dunning watcher skips users who have `reminderSentAt` set within the current cycle.
- When M-Pesa processes a successful payment, the `reminderSentAt` timestamp is set to `null` inside the database transaction, enabling warning alerts for the *next* billing cycle.
- **Idempotency Guard**: Replayed Safaricom webhook callbacks are rejected by checking locked payment states, ensuring customers only get a warning receipt *once*.

---

## 6. Dashboard Cost Tracking

outbound logs (`sms_logs`) store the actual cost returned by the gateway. The admin stats endpoint (`GET /api/admin/sms/stats`) sums these values to provide real dunning cost visibility:

- Accounts for multi-part messages (longer than 160 characters, which cost double or triple).
- Tracks total units sent this month and KES spend.
