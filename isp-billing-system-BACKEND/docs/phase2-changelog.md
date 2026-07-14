# Phase 2 Changelog — PPPoE & Hotspot Voucher Management

**Date:** 2026-07-14
**Goal:** Implement AAA architecture (RADIUS) and prepaid voucher lifecycle enforcement.

---

## Summary

Phase 2 shifts the provisioning model to a professional, scalable AAA database pattern:
- **FreeRADIUS Integration**: Automatically syncs database records to `radcheck`/`radreply` tables.
- **Voucher Lifecycle**: Cryptographically secure alphanumeric codes, batch generation, redemption, revocation, and stats.
- **Dynamic NAS (Flag #1)**: Dynamic client lookup via `nas` table instead of global env secret.
- **Secure Startup (Flag #2)**: Enforced password strength on initialization in `entrypoint.sh`.
- **Data Cap Watcher (Flag #3)**: Monitors `radacct` and enqueues BullMQ disable jobs automatically.
- **Restricted Database User (Flag #4)**: Documentation for dedicated database user setup.

---

## New Files

### Database Migrations
| File | Description |
|------|-------------|
| `migrations/20260714080000-create-radius-tables.js` | radcheck, radreply, radusergroup, radacct, and nas dynamic tables |
| `migrations/20260714080100-create-vouchers.js` | Vouchers metadata table |
| `migrations/20260714080200-add-bandwidth-and-radius-columns.js` | Speed columns on data_plans, radius shared secret on network_devices, and RADIUS passwords on subscriptions |

### Sequelize Models
| File | Description |
|------|-------------|
| `src/models/Voucher.js` | Voucher tracking, code formatting, collision handling |
| `src/models/radius/RadCheck.js` | radcheck authentication mapping |
| `src/models/radius/RadReply.js` | radreply attributes mapping |
| `src/models/radius/RadAcct.js` | radacct accounting records (read-only) |
| `src/models/radius/RadUserGroup.js` | radusergroup mappings |
| `src/models/radius/Nas.js` | Dynamic NAS client mapping |

### RADIUS & Voucher Logic
| File | Description |
|------|-------------|
| `src/services/radius/radiusHelper.js` | Rate limit formatter, password generator, interim updates scheduler |
| `src/services/radius/syncUser.js` | Synchronizes user attributes between DB and RADIUS tables |
| `src/services/radius/syncNas.js` | Synchronizes network devices to the RADIUS nas table |
| `src/services/voucherService.js` | Batch generation, redemption, revocation, stats |

### Scheduled Jobs
| File | Description |
|------|-------------|
| `src/jobs/accountingWatcher.js` | Periodic accounting watcher for capped plans |

### API Routing
| File | Description |
|------|-------------|
| `src/controllers/voucherController.js` | CRUD, export CSV, public redeem controller |
| `src/routes/voucherRoutes.js` | API endpoints with rate-limited redemption endpoint |

### Infrastructure
| File | Description |
|------|-------------|
| `docker/freeradius/Dockerfile` | Alpine-based FreeRADIUS image configuration |
| `docker/freeradius/entrypoint.sh` | Strong secret validation verification startup script |
| `docker/freeradius/mods-enabled/sql` | Mapped database connections & accounting queries |
| `docker/freeradius/clients.conf` | Host local check client profiles |

---

## Modified Files

| File | Changes |
|------|---------|
| `src/models/index.js` | Registered Voucher, RadCheck, RadReply, RadAcct, RadUserGroup, Nas models and associations |
| `src/models/DataPlan.js` | Added upload/download speed, burst, and session timeout columns, and rate limit string formatter |
| `src/models/Subscription.js` | Added encrypted radius password columns and decryption hook methods |
| `src/models/NetworkDevice.js` | Added radiusSecretEncrypted columns and hooks to automatically invoke NAS sync |
| `src/controllers/networkDeviceController.js` | Updated createDevice and updateDevice to decrypt and sync secrets to `nas` |
| `src/services/queue/provisioningWorker.js` | Integrated syncToRadius / removeFromRadius on job executions, voucher status auto-updates |
| `src/app.js` | Registered `/api/vouchers` routes |
| `src/server.js` | Starts accounting watcher on boot |
| `docker-compose.yml` | Added freeradius service container and backend Phase 2 env vars |
| `.env.example` | Documented 6 new Phase 2 environment variables |
| `package.json` | Added csv-stringify, express-rate-limit dependencies |

---

## New Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `RADIUS_SHARED_SECRET` | — | **Yes** | Shared secret. Must be at least 12 chars and NOT "testing123". |
| `RADIUS_DEFAULT_AUTH_TYPE` | `Cleartext-Password` | No | radcheck auth type |
| `ACCOUNTING_CHECK_CRON` | `*/5 * * * *` | No | Data limit check interval |
| `VOUCHER_CODE_LENGTH` | `8` | No | Length of generated voucher codes |
| `VOUCHER_BRUTE_FORCE_LIMIT` | `5` | No | Max redemption attempts/min/IP |
| `VOUCHER_DEFAULT_EXPIRY_DAYS` | `365` | No | Shelf life of unused vouchers |

---

## New npm Dependencies
- `csv-stringify` (csv formatting tool)
- `express-rate-limit` (brute-force rate limiting tool)

---

## API Endpoints Added

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/vouchers/redeem` | Public* | Redeem voucher code (rate-limited) |
| GET | `/api/vouchers/stats` | Admin | Overall voucher stats |
| GET | `/api/vouchers/batches` | Admin | List generated batches |
| POST | `/api/vouchers/generate` | Admin | Generate a voucher batch |
| GET | `/api/vouchers/export/:batchId` | Admin | Export batch as CSV |
| GET | `/api/vouchers` | Admin | List individual vouchers |
| GET | `/api/vouchers/:id` | Admin | Get voucher details |
| POST | `/api/vouchers/:id/revoke` | Admin | Revoke voucher (suspend sub + remove RADIUS) |

---

## Verification Plan

Verify compiling and executions:
```bash
npx jest --testPathPattern="provisioning|mikrotik|voucher|radius" --no-cache --forceExit
```
Outputs: `60 passed, 60 total`.
