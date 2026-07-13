# Phase 1 Changelog — MikroTik RouterOS API Integration

**Date:** 2026-07-13
**Goal:** Close the loop between billing events and actual network access control.

---

## Summary

Phase 1 wires MikroTik RouterOS API calls into the existing billing system so that:
- A successful M-Pesa payment automatically restores a customer's internet access
- An expired subscription automatically cuts off access (with grace period)
- A reconciliation sweep self-heals any mismatches between DB and router state
- All router commands are audit-logged for debugging and compliance

---

## New Files

### Database Migrations
| File | Description |
|------|-------------|
| `migrations/20260713080000-create-network-devices.js` | Network devices table (encrypted credentials, per-router address-list name) |
| `migrations/20260713080100-create-router-command-log.js` | Router command audit log |
| `migrations/20260713080200-add-network-columns-to-subscriptions.js` | Adds connection_type, network_device_id, network_identifier, grace_period_hours, etc. to subscriptions |

### Sequelize Models
| File | Description |
|------|-------------|
| `src/models/NetworkDevice.js` | Network device model with AES-256-GCM password encryption |
| `src/models/RouterCommandLog.js` | Write-only audit log model |

### MikroTik Client & Strategies
| File | Description |
|------|-------------|
| `src/services/mikrotik/client.js` | Connection-pooled RouterOS client with circuit breaker |
| `src/services/mikrotik/mockClient.js` | In-memory mock for CI/testing |
| `src/services/mikrotik/provisioning.js` | Provisioning abstraction layer |
| `src/services/mikrotik/strategies/addressListStrategy.js` | Address-list enable/disable |
| `src/services/mikrotik/strategies/pppoeStrategy.js` | PPPoE secret enable/disable + session drop |
| `src/services/mikrotik/strategies/hotspotStrategy.js` | Hotspot IP binding enable/disable |

### BullMQ Queue System
| File | Description |
|------|-------------|
| `src/services/queue/queueManager.js` | Queue setup (3 queues: provisioning, expiry, reconciliation) |
| `src/services/queue/provisioningWorker.js` | Circuit-breaker-aware worker |

### Scheduled Jobs
| File | Description |
|------|-------------|
| `src/jobs/expireSubscriptions.js` | Finds expired subs, enqueues disable jobs |
| `src/jobs/reconcileProvisioning.js` | Compares DB vs router state, self-heals |

### Admin API
| File | Description |
|------|-------------|
| `src/controllers/networkDeviceController.js` | CRUD + connection test + audit log viewer |
| `src/routes/networkDeviceRoutes.js` | Admin-only Express routes |

### Documentation
| File | Description |
|------|-------------|
| `docs/mikrotik-setup.md` | Router-side configuration guide |
| `docs/phase1-changelog.md` | This file |

### Tests
| File | Description |
|------|-------------|
| `tests/unit/mikrotikClient.test.js` | Circuit breaker, encryption, mock client tests |
| `tests/integration/provisioning.test.js` | End-to-end enable/disable/dedup/reconciliation tests |

---

## Modified Files

| File | Changes |
|------|---------|
| `src/models/index.js` | Registered NetworkDevice, RouterCommandLog; added associations |
| `src/models/Subscription.js` | Added connectionType, networkDeviceId, networkIdentifier, gracePeriodHours, provisioningRetryCount, lastProvisioningAttempt, reminderSentAt columns |
| `src/services/paymentService.js` | Wired provisioning queue into M-Pesa callback (after transaction commit) |
| `src/app.js` | Registered `/api/admin/network-devices` route |
| `src/server.js` | Starts BullMQ worker + expiry/reconciliation schedulers on boot |
| `docker-compose.yml` | Added Redis service, Redis env vars, redis_data volume |
| `.env.example` | Documented all new Phase 1 environment variables |
| `package.json` | Added routeros-client, bullmq, ioredis, node-cron |

---

## New Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `REDIS_HOST` | `localhost` | Yes | Redis host for BullMQ |
| `REDIS_PORT` | `6379` | Yes | Redis port |
| `REDIS_PASSWORD` | — | No | Redis password |
| `ROUTER_ENCRYPTION_KEY` | — | **Yes** | 32-byte hex key for AES-256-GCM. **Back up securely.** |
| `MOCK_MIKROTIK` | `false` | No | Set `true` for testing without a router |
| `EXPIRY_CHECK_CRON` | `*/10 * * * *` | No | Expiry sweep interval |
| `RECONCILIATION_CRON` | `*/30 * * * *` | No | Reconciliation sweep interval |
| `DEFAULT_GRACE_PERIOD_HOURS` | `24` | No | Default grace period before cutoff |
| `PROVISIONING_MAX_RETRIES` | `10` | No | Max retry attempts |
| `CIRCUIT_BREAKER_REQUEUE_DELAY_MS` | `60000` | No | Delay when circuit is open |

---

## New npm Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `routeros-client` | latest | RouterOS v7 API client |
| `bullmq` | latest | Production job queue with retry/backoff |
| `ioredis` | latest | Redis client (BullMQ peer dep) |
| `node-cron` | latest | Cron scheduler |

---

## Manual Steps Required

1. Generate `ROUTER_ENCRYPTION_KEY` and add to `.env` (see docs/mikrotik-setup.md §7)
2. Enable RouterOS API on your MikroTik router(s) (see docs/mikrotik-setup.md §1)
3. Create a dedicated API user on the router (see docs/mikrotik-setup.md §2)
4. Configure firewall rules for address-list strategy (see docs/mikrotik-setup.md §3)
5. Add router(s) via `POST /api/admin/network-devices`
6. Update existing subscriptions with `connection_type`, `network_device_id`, `network_identifier`

---

## API Endpoints Added

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/admin/network-devices` | Admin | List all routers |
| POST | `/api/admin/network-devices` | Admin | Add a router |
| PUT | `/api/admin/network-devices/:id` | Admin | Update a router |
| DELETE | `/api/admin/network-devices/:id` | Admin | Deactivate a router |
| POST | `/api/admin/network-devices/:id/test` | Admin | Test router connection |
| GET | `/api/admin/network-devices/logs` | Admin | Query command audit logs |
