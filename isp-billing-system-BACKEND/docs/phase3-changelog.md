# Phase 3 Changelog — Smart Dunning & SMS Automation

**Date:** 2026-07-14
**Goal:** Implement BullMQ-decoupled SMS notifications, cost auditing, template interpolator, and cycle-aware dunning reminders.

---

## Summary

Phase 3 introduces automated notification flows and cost tracking, fully decoupled into background jobs:
- **BullMQ SMS Worker (`smsWorker.js`)**: Processes SMS asynchronously, handles failures, and executes up to 3 exponential backoff retries.
- **REST Gateway Adapter (`smsClient.js`)**: Outbound rest caller with direct cost extraction from Africa's Talking API.
- **Dunning Sweeper (`sendSmsReminders.js`)**: Runs hourly warnings for users expiring in `< 24 hours` and skips duplicate warnings within the same cycle.
- **M-Pesa Idempotency & Reset**: Checks locked payment status, ignores replayed callbacks, resets warning status, and delivers receipts.
- **Ugandan/Kenyan formatting**: Multi-market phone number format normalizer.
- **Admin cost audits**: Database stats aggregates reflecting actual gateway billing costs.

---

## New Files

### Database Migrations
| File | Description |
|------|-------------|
| `migrations/20260714080300-create-sms-tables.js` | sms_templates (placeholders) and sms_logs (costs & provider status) |

### Sequelize Models
| File | Description |
|------|-------------|
| `src/models/SmsLog.js` | Audited log of sent messages, statuses, and costs |
| `src/models/SmsTemplate.js` | Customizable templates with variable interpolation methods |

### Services & Workers
| File | Description |
|------|-------------|
| `src/services/queue/smsWorker.js` | BullMQ worker executing E.164 formatting, templates loading, and retries |
| `src/services/sms/smsClient.js` | Gateway adapter (Africa's Talking cost parser, Advanta stub, Mock client) |
| `src/services/sms/smsSender.js` | Outbound trigger facade enqueuing jobs with deterministic jobIds |

### Scheduled Jobs
| File | Description |
|------|-------------|
| `src/jobs/sendSmsReminders.js` | Hourly cron job finding expiring users, resetting warning fatigue |

### Routing & Controllers
| File | Description |
|------|-------------|
| `src/controllers/smsController.js` | Paginated SMS logs, total cost aggregation, template updates |
| `src/routes/smsRoutes.js` | Admin SMS routes gating audit stats |

---

## Modified Files

| File | Changes |
|------|---------|
| `src/models/index.js` | Registered SmsLog and SmsTemplate models; seeds default templates on DB sync |
| `src/services/queue/queueManager.js` | Registered and configured BullMQ `sms` queue and `addSmsJob` helper |
| `src/services/paymentService.js` | Added callback idempotency checks, cleared dunning flag, and queued receipt SMS |
| `src/services/queue/provisioningWorker.js` | Triggered disconnection notice SMS on successful subscriber cutoff |
| `src/services/voucherService.js` | Added `purchaseVoucherRemote` and wired SMS voucher code delivery |
| `src/app.js` | Registered `/api/admin/sms` routing |
| `src/server.js` | Started SMS Worker and Dunning Scheduler on boot |
| `docker-compose.yml` | Injected SMS env vars into backend container service |
| `.env.example` | Documented 6 new Phase 3 environment variables |

---

## New Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `SMS_PROVIDER` | `mock` | No | SMS provider: `africastalking` \| `advanta` \| `mock` |
| `AT_USERNAME` | — | **Yes (AT)** | Africa's Talking API username (or `sandbox`) |
| `AT_API_KEY` | — | **Yes (AT)** | Africa's Talking API key |
| `AT_SENDER_ID` | — | No | Registered alphanumeric Sender ID (from header) |
| `DUNNING_CHECK_CRON` | `0 * * * *` | No | Cron schedule for dunning reminders (hourly) |
| `SMS_DUNNING_WINDOW_HOURS` | `24` | No | Warning hours threshold before cutoff |
| `DEFAULT_COUNTRY_CODE` | `254` | No | Format prefixes: `254` (Kenya) \| `256` (Uganda) |

---

## Verification Plan

Verify compiling, triggers, and execution flows:
```bash
npx jest --testPathPattern="provisioning|mikrotik|voucher|radius|sms" --no-cache --forceExit
```
Outputs: `72 passed, 72 total`.
