# ISP Billing & Management System — Production-Grade Upgrade Plan
### Prompt for AI Code Editor (Cursor / Claude Code / Windsurf)

---

## 0. CONTEXT — READ THIS FIRST

You are working inside an existing final-year-project-turned-production ISP Billing and
Management System with this stack:

- **Backend:** Node.js + Express.js
- **Frontend:** React.js (Admin Dashboard)
- **Database:** MySQL
- **AI Microservice:** Python/Flask (Multiple Linear Regression model for revenue prediction
  and anomaly detection)
- **Payments:** M-Pesa Daraja API (STK Push + callback)
- **Auth:** JWT
- **Deployment:** Docker

Today the system only updates MySQL rows when a payment succeeds — it does **not** touch
any network hardware. The goal of this upgrade is to turn it into a real ISP automation
platform (the way Centipid ISP Billing System operates in Kenya/Uganda) by wiring billing
events to actual MikroTik RouterOS actions, adding PPPoE/Hotspot voucher management,
SMS dunning, a captive portal, and real-time bandwidth telemetry feeding the existing AI
anomaly detection model.

**Do not rewrite the existing billing/auth/dashboard code.** Extend it. Treat this as
additive architecture: new services, new tables, new routes, new cron jobs — wired into
what already exists via clean interfaces.

**Work in phases, in order.** Do not start Phase 2 until Phase 1 compiles, has tests, and
you've shown me a summary of what changed. At the end of each phase, produce:
1. A short changelog of files added/modified
2. Any new environment variables required
3. Any new DB migration files
4. A list of manual steps I need to do outside the code editor (e.g. "install
   FreeRADIUS on the VPS", "enable API access on the MikroTik router")

Ask clarifying questions before Phase 1 if any of the following are unknown — don't guess:
- MikroTik RouterOS version and whether it's v6 or v7
- Whether customers are provisioned via **PPPoE**, **static IP + firewall address-lists**,
  **Hotspot**, or a mix
- Whether there's already a RADIUS server anywhere in the network
- Current MySQL schema for `users`, `subscriptions`, `plans`, `payments` (ask me to paste
  it or find it in the repo)
- SMS provider preference (Africa's Talking vs Advanta Africa vs others)
- Whether this targets a single router (small deployment) or multiple routers across
  sites (multi-tenant / multi-NAS)

---

## PHASE 1 — MikroTik RouterOS API Integration (Core Network Control)

**Goal:** Close the loop between "payment succeeds in MySQL" and "customer actually gets
internet." This is the single most important phase — everything else depends on it.

### 1.1 Library & Connection Layer
- Add `node-routeros` (or `routeros-client`, evaluate both — prefer one with active
  maintenance and TLS/API-SSL support for RouterOS v7) as a backend dependency.
- Create `backend/services/mikrotik/client.js`:
  - A connection-pooled wrapper around the RouterOS API (host, port 8728/8729,
    username, password pulled from `.env`, never hardcoded).
  - Support connecting to **multiple routers** even if only one is used today — store
    router credentials in a new `network_devices` table (`id, name, ip_address,
    api_port, username, password_encrypted, site_id, is_active`). Passwords must be
    encrypted at rest (use Node `crypto` with a key from env, not stored in DB).
  - Implement automatic reconnect/retry with exponential backoff and a circuit breaker
    so a router outage doesn't crash the whole backend.
  - Log every command sent to the router (audit trail) into a `router_command_log`
    table: `id, device_id, command, params, triggered_by (user_id/system/cron),
    result, success, created_at`.

### 1.2 Provisioning Abstraction
Create `backend/services/mikrotik/provisioning.js` exposing a clean interface that the
rest of the app calls — it should not need to know which method (address-list vs
PPPoE) is in use underneath:

```js
enableCustomer(customerId)   // restore full access
disableCustomer(customerId)  // cut off access (non-destructive, reversible)
getCustomerStatus(customerId) // 'active' | 'suspended' | 'unknown'
```

Internally implement **two strategies**, selected per-customer via a
`connection_type` column on `subscriptions` (`'address_list' | 'pppoe' | 'hotspot'`):

- **Address-list strategy:** add/remove the customer's IP (or MAC) from a MikroTik
  `/ip firewall address-list` named e.g. `cutoff-list`, which a firewall filter rule
  already blocks/allows in the router config. Document the exact RouterOS firewall
  rule the ISP needs to have configured (write this into a `docs/mikrotik-setup.md`
  file you generate).
- **PPPoE strategy:** enable/disable the customer's `/ppp secret` entry (`disabled=yes/no`)
  and, if they're currently connected, force-drop their active PPPoE session so the
  change takes effect immediately instead of waiting for their next reconnect.

### 1.3 Automated Disconnection (Shunting) — Cron Job
- Add `backend/jobs/expireSubscriptions.js` using `node-cron` (or `bullmq` if you
  want retry/queue guarantees — prefer BullMQ + Redis for production reliability over
  bare node-cron, since a failed MikroTik call must retry, not just log and vanish).
- Runs every 5–15 minutes (configurable via env `EXPIRY_CHECK_CRON`):
  1. Query MySQL for subscriptions where `expires_at < NOW()` and `status = 'active'`.
  2. For each, call `provisioning.disableCustomer()`.
  3. On success: set `status = 'suspended'`, log to `router_command_log`.
  4. On failure: leave status as-is, increment a `retry_count`, alert (see Phase 3
     SMS/notification hooks) if `retry_count` exceeds a threshold — don't silently
     leave someone connected forever because of one failed API call.
  5. **Grace period support:** respect an optional `grace_period_hours` on the plan —
     don't cut someone off the instant they expire if the plan allows a buffer.

### 1.4 Automated Reconnection — Wire into M-Pesa Callback
- Locate the existing `api/mpesa/callback` route.
- After successfully parsing `ResultCode: 0` and updating the subscription/payment
  records, add a call to `provisioning.enableCustomer(customerId)`.
- Wrap this in a try/catch that does **not** roll back the payment record if the
  router call fails — money was already received, so:
  - Log the failure to `router_command_log`.
  - Push the job onto a retry queue (BullMQ) with backoff, so reconnection is
    retried automatically instead of requiring the customer to complain first.
  - This decoupling (payment success vs. provisioning success) is critical — never
    make MySQL payment confirmation dependent on router availability.

### 1.5 Testing
- Add a `MOCK_MIKROTIK=true` env flag that swaps the real RouterOS client for an
  in-memory mock, so the whole billing flow can be tested in CI/local dev without a
  physical or virtual router.
- Write integration tests for: expiry → disable, payment → enable, retry-on-failure.
- Recommend (and if possible set up) a **MikroTik CHR (Cloud Hosted Router)** in a
  free-tier VM or Docker/GNS3 for local testing against a real RouterOS API instance
  rather than only mocks.

**Deliverable for Phase 1:** A working, tested loop where marking a subscription
expired in MySQL actually blocks the customer on the router, and a successful M-Pesa
payment actually restores them — with full audit logging and retry safety.

---

## PHASE 2 — PPPoE & Hotspot Voucher Management (RADIUS Integration)

**Goal:** Move from "one router, manually configured secrets" to a professional,
scalable AAA (Authentication, Authorization, Accounting) setup, and add prepaid
voucher support like Centipid's hotspot vouchers.

### 2.1 FreeRADIUS Setup
- This is primarily an **infrastructure task, not a code task** — document it clearly
  rather than trying to automate installation:
  - Write `docs/freeradius-setup.md` covering: installing FreeRADIUS, configuring the
    `sql` module to point at the existing MySQL database, and configuring MikroTik as
    a RADIUS client (shared secret, NAS IP).
  - Use FreeRADIUS's standard schema (`radcheck`, `radreply`, `radacct`,
    `radusergroup`) — do NOT invent a custom schema; this is what makes it
    interoperable with standard tooling later.
- Add a **sync layer**: `backend/services/radius/syncUser.js` that, whenever a
  subscription/plan changes in the app's own tables, writes/updates the
  corresponding `radcheck` (password / `Cleartext-Password`) and `radreply`
  (`Mikrotik-Rate-Limit` for bandwidth caps, `Session-Timeout` for time-based
  vouchers) rows. Keep your app's tables as the source of truth; RADIUS tables are a
  derived/synced view.

### 2.2 Voucher Generator
- New table `vouchers`: `id, code, plan_id, data_limit_mb (nullable),
  time_limit_minutes (nullable), price, status ('unused'|'active'|'expired'|'used'),
  batch_id, created_by, created_at, redeemed_at, redeemed_by_customer_id`.
- Backend endpoint `POST /api/vouchers/generate`:
  - Accepts `{ planId, quantity, dataLimitMb?, timeLimitMinutes?, prefix? }`.
  - Generates cryptographically random alphanumeric codes (avoid ambiguous
    characters like `0/O`, `1/I/l`), checks for collisions, batch-inserts.
  - Returns a printable batch (also generate a CSV/PDF export endpoint — check if the
    `pdf` skill/tooling in this repo can be reused for printable voucher sheets).
- React admin dashboard: new **Vouchers** page —
  - Form to generate a batch (plan, quantity, data/time limit).
  - Table of existing vouchers with status filter, search by code.
  - "Print batch" / "Export CSV" buttons.
- Redemption endpoint `POST /api/vouchers/redeem` (called from the captive portal in
  Phase 4): validates code, marks it `active`, creates/updates a RADIUS user entry
  scoped to that voucher's limits, sets an expiry.

### 2.3 Data/Time Limit Enforcement
- For **data-based** vouchers/plans: RADIUS accounting (`radacct`) already gets
  updated by MikroTik as `Interim-Update` packets arrive if configured — write a
  small consumer (`backend/services/radius/accountingWatcher.js`) that periodically
  reads `radacct` for cumulative `acctinputoctets + acctoutputoctets` per active
  session and disconnects (via CoA — Change of Authorization / RADIUS
  Disconnect-Request, or fallback to the Phase 1 MikroTik provisioning layer) once
  the voucher's data cap is hit.
- For **time-based** vouchers: rely on RADIUS `Session-Timeout` attribute — RouterOS
  will disconnect automatically; your job is just to sync the correct value in
  `radreply` at redemption time.

**Deliverable for Phase 2:** Admin can generate a batch of vouchers from the
dashboard, print/export them, and a customer can redeem one to get scoped,
auto-expiring internet access — without needing per-customer PPPoE secrets managed
by hand.

---

## PHASE 3 — Smart Dunning & SMS Automation

**Goal:** Reduce churn and support tickets by notifying customers automatically —
mirrors Centipid's SMS reminders and receipts.

### 3.1 SMS Provider Integration
- Add an SMS abstraction `backend/services/sms/smsClient.js` with a single
  `sendSms(to, message, tag?)` method, so the provider can be swapped without
  touching call sites.
- Implement the **Africa's Talking** adapter first (best documented, widely used in
  KE/UG) behind that interface; leave a stub/interface for Advanta Africa as a
  secondary adapter.
- Store all outbound messages in an `sms_log` table (`id, to, message, tag, status,
  provider_response, created_at`) for auditability and to avoid duplicate sends.
- Add rate-limiting/backoff and cost tracking (Africa's Talking bills per SMS —
  surface a simple "SMS sent this month" counter in the admin dashboard).

### 3.2 Trigger Points
Wire `sendSms` into these existing flows (search the codebase for the right
insertion points rather than guessing filenames):
- **Pre-expiry reminder:** extend the Phase 1 cron job (or add a sibling job) that
  finds subscriptions expiring within N hours (configurable, e.g. 24h) and sends a
  reminder SMS with a pay link/USSD prompt. Track that a reminder was already sent
  per billing cycle (`reminder_sent_at` column) to avoid spamming.
- **Payment receipt:** in `api/mpesa/callback`, right after confirming `ResultCode: 0`
  and updating the subscription, send an SMS receipt (amount, plan, new expiry date).
- **Disconnection notice:** when the Phase 1 expiry job actually disables a customer,
  send an SMS immediately after ("Your internet has been suspended due to non-payment.
  Pay via [STK/paybill] to restore instantly.").
- **Voucher delivery** (from Phase 2): if a voucher is purchased remotely (not printed),
  SMS the code to the buyer's phone number.

### 3.3 Templates
- Store message templates in a DB table or config file (not hardcoded strings) so
  the ISP admin can edit wording/branding without a code deploy —
  `sms_templates` table: `key, template, variables_used`. Use a simple `{{variable}}`
  interpolation.

**Deliverable for Phase 3:** Every billing lifecycle event (upcoming expiry, payment
success, disconnection) automatically triggers a branded SMS, logged and rate-limited.

---

## PHASE 4 — Client Self-Service & Captive Portal

**Goal:** Give end-users a self-service flow instead of everything running through
admin/support — this is what customers of a real ISP expect.

### 4.1 Captive Portal (React)
- New React app or route group, `frontend/captive-portal/`, deliberately **separate**
  from the admin dashboard bundle (different auth model, must be lightweight/fast on
  mobile data, and should not expose admin routes/JS).
- Router redirect flow: configure MikroTik Hotspot to redirect unauthenticated users
  to this portal's URL (document this in `docs/mikrotik-setup.md` from Phase 1,
  including how MikroTik passes `mac`, `ip`, and `link-login-only` params you'll need
  to read from the query string).
- Portal screens:
  1. **Voucher entry** — input a code, call `POST /api/vouchers/redeem`
     (Phase 2), on success call MikroTik Hotspot's login mechanism (either via the
     `$(link-login)` HTML form MikroTik expects, or via API) to grant access.
  2. **Buy now via M-Pesa** — phone number + plan selection → triggers STK push
     using the *existing* Daraja integration → polls a status endpoint → on success,
     auto-provisions and logs the user in.
  3. Branding: pull ISP name/logo/colors from a `branding` settings table so this is
     reusable across different ISP deployments, not hardcoded to one company.

### 4.2 Client Self-Service Portal (authenticated)
- Separate from the captive portal — this is the "my account" area for existing
  subscribers (could be a route group inside the existing React app, gated by a
  lighter customer-role JWT rather than admin JWT).
- Features:
  - View current plan, data usage (fed by Phase 5 telemetry), expiry date.
  - Payment history and downloadable receipts.
  - Renew/upgrade plan (triggers STK push).
  - Update contact details.
  - Raise a support ticket (check if a ticket system already exists in the repo per
    the ERD mentioned in the project proposal — `Support Tickets` entity — reuse it).
- Auth: reuse the existing JWT middleware, but confirm/add a `role: 'customer'` path
  distinct from `role: 'admin'/'staff'` so permissions are properly scoped (a
  customer must never be able to hit admin-only routes — add explicit route guards
  and write a test asserting this).

**Deliverable for Phase 4:** A customer can connect to WiFi, get redirected to a
branded portal, pay or redeem a voucher, and get online with zero admin
intervention. Existing subscribers can self-manage via a portal.

---

## PHASE 5 — Real-Time Bandwidth Monitoring & Feeding the AI Model

**Goal:** Replace mocked "average data usage" with real telemetry so the existing
Flask MLR/anomaly-detection model works on real numbers.

### 5.1 Telemetry Collector
- `backend/jobs/collectBandwidth.js`, a scheduled job (every 1–5 minutes, configurable):
  - For PPPoE customers: query MikroTik `/ppp active` for connected sessions and
    read the interface RX/TX byte counters.
  - For address-list/simple-queue customers: query `/queue simple` (if bandwidth
    shaping is done via simple queues) for per-customer byte counters.
  - For RADIUS/hotspot customers: prefer reading `radacct` (already accumulating
    interim updates from Phase 2) rather than double-polling the router.
- Normalize all sources into one table: `usage_samples (id, customer_id, rx_bytes,
  tx_bytes, sample_time, source)`. Store deltas (bytes since last sample), not just
  raw counters, so downstream consumers don't need to know about counter resets.
- **Important:** MikroTik counters can reset/wrap on interface restart — handle that
  edge case explicitly (if new reading < old reading, treat as a reset and don't
  produce a negative delta).

### 5.2 Aggregation
- Roll up `usage_samples` into hourly/daily aggregates
  (`usage_daily(customer_id, date, total_rx_bytes, total_tx_bytes)`) via a nightly
  job — don't make the AI service query raw per-minute samples for every request.

### 5.3 Feed into the Flask AI Microservice
- Locate the existing Flask MLR/anomaly-detection service and its current data
  input path (find where it currently reads "average data usage" — likely a mocked
  value or a simple aggregate query).
- Replace the mock with a real query against `usage_daily` (or expose a small
  internal API endpoint from the Node backend, e.g.
  `GET /internal/usage/:customerId?range=30d`, that Flask calls — decide based on
  whether Flask already reads MySQL directly or goes through Node's API; keep
  consistent with the existing pattern in the repo rather than introducing a second
  access path).
- Confirm/extend the Z-score anomaly logic to flag cases like "user downloading
  500GB in a day" using the now-real `usage_daily` numbers, and wire a resulting
  "anomaly" flag back into the admin dashboard (e.g., a "Flagged for review" badge on
  the customer list) — optionally trigger an internal admin notification (reuse the
  Phase 3 SMS/notification layer for an internal alert, or add an in-app
  notification if that exists).

**Deliverable for Phase 5:** Live RX/TX data flows from the router into MySQL, gets
aggregated, and is consumed by the real AI model instead of mock data — with
anomalies surfaced in the admin UI.

---

## CROSS-CUTTING REQUIREMENTS (apply to every phase)

1. **Never hardcode secrets** — router credentials, SMS API keys, RADIUS shared
   secrets all go through `.env` / a secrets manager, never committed.
2. **Idempotency** — cron jobs and webhook handlers (M-Pesa callback especially)
   must be safe to run/receive twice without double-charging, double-enabling, or
   double-sending SMS. Use unique constraint checks or idempotency keys.
3. **Observability** — every new service (MikroTik client, RADIUS sync, SMS client,
   telemetry collector) should log structured errors (not just `console.log`) so
   failures are debuggable in production. If the repo already has a logging library
   (winston/pino), use it; don't introduce a second one.
4. **Migrations** — every schema change goes through a proper migration file
   (check what migration tool, if any, the repo already uses — e.g.
   Sequelize/Knex/raw SQL — and follow that pattern; don't hand-edit the DB).
5. **Docker** — new services (FreeRADIUS, Redis for BullMQ if used) should be added
   to the existing `docker-compose.yml` so `docker-compose up` still brings up the
   whole stack in one command.
6. **Security review per phase** — the MikroTik API and RADIUS shared secret are
   high-value credentials; the captive portal is public-facing and unauthenticated
   by definition, so it needs input validation and rate-limiting (voucher brute-force
   protection especially — throttle redemption attempts per IP/MAC).
7. **Write a short `docs/` note per phase** explaining what was built and any manual
   network-side configuration required — this project started as an academic
   proposal, so documentation quality matters for eventual write-up/demo as well as
   for real operability.

---

## SUGGESTED ORDER OF EXECUTION

1. Phase 1 (MikroTik core control) — unlocks everything else, do this first.
2. Phase 3 (SMS) — small, high value, easy to slot into Phase 1's cron/webhook work
   while it's already open.
3. Phase 2 (RADIUS/vouchers) — bigger infra lift, do once Phase 1 is stable.
4. Phase 5 (telemetry → AI) — depends on Phase 1/2 data sources existing.
5. Phase 4 (captive portal + client portal) — pulls together vouchers (Phase 2),
   payments (existing), and telemetry (Phase 5) into the user-facing surface, so it
   naturally comes last even though it's the most visible feature.

Start by asking me the clarifying questions in Section 0, then produce a Phase 1
implementation plan (file list + schema diff) for my review before writing code.
