# ISP Billing & Management System — Full-System Production Readiness Audit

**Audit Date:** July 16, 2026  
**Status Overview:** 🔴 **CRITICAL GAPS IDENTIFIED**  
The system is feature-complete on paper, but critical bugs in the core expiry sweep, database schema migrations, external payment callback validation, and operational disaster recovery block production deployment.

---

## 1. BACKEND (Node.js / Express)

### 1.1 Core Billing & Payment Flow
*   **Idempotency & Replays:** The transaction lock in `paymentService.processCallback` ([paymentService.js:331](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/paymentService.js#L331)) correctly implements a database lock on `Payment` records and exits early on callback replays. This prevents duplicate charging and multiple activations.
*   **Downstream Isolation Gaps:**
    *   🔴 **Critical (Voucher Generation Vulnerability):** In [paymentService.js:477-493](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/paymentService.js#L477-L493), the remote voucher purchase generation is triggered *outside* the database transaction post-commit. If the remote voucher service fails (e.g. database error, system crash, or SMS gateway timeout), the payment remains marked `COMPLETED`, but the voucher code is never generated, stored, or sent to the client. Replayed callbacks will be ignored as completed, leaving the customer charged but without service and with no automated recovery/retry path.
    *   🟠 **High (Database Connection Lock during HTTP API Call):** In [paymentService.js:92](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/paymentService.js#L92), the external Safaricom M-Pesa STK Push API call is made *inside* the active Sequelize transaction. If the Safaricom Daraja API experiences high latency or timeouts (up to 30 seconds), the database transaction and table/row locks remain held, risking connection pool exhaustion and locking out other users.
*   **Failed-Payment Paths:** Handled correctly. STK push initiation catches API errors and rolls back the payment creation transaction ([paymentService.js:131](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/paymentService.js#L131)).

### 1.2 MikroTik Provisioning Layer
*   🟠 **High (Reconciliation Syntax Error):** In [reconcileProvisioning.js:48](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/jobs/reconcileProvisioning.js#L48) and [line 95](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/jobs/reconcileProvisioning.js#L95), the reconciliation sweep uses the query clause `order: [['last_provisioning_attempt', 'ASC NULLS FIRST']]`. In MySQL, `NULLS FIRST` is syntactically invalid and causes immediate SQL syntax errors on every execution, completely breaking the reconciliation scheduler.
*   **Credential Encryption:** Implemented securely via AES-256-GCM. Plaintext passwords never appear in command logs ([client.js:262](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/mikrotik/client.js#L262)).
*   **Strategy Implementation:** All three provisioning strategies (`address_list`, `pppoe`, `hotspot`) are fully implemented in their respective strategies ([addressListStrategy.js](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/mikrotik/strategies/addressListStrategy.js), [pppoeStrategy.js](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/mikrotik/strategies/pppoeStrategy.js), [hotspotStrategy.js](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/mikrotik/strategies/hotspotStrategy.js)).

### 1.3 RADIUS Sync Layer
*   **Idempotency:** Implemented cleanly. `syncToRadius()` destroys existing entries before creating new ones ([syncUser.js:76-78](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/radius/syncUser.js#L76-L78)).
*   **Dynamic NAS Client Sync:** Fully wired into `afterCreate`, `afterUpdate`, and `afterDestroy` hooks of `NetworkDevice` ([NetworkDevice.js:207-228](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/models/NetworkDevice.js#L207-L228)).
*   **Database Grants:** Handled securely in setup docs ([freeradius-setup.md:52-56](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/docs/freeradius-setup.md#L52-L56)), but violated in Docker compose deployment configuration (see Section 3).

### 1.4 Voucher System
*   **Lifecycle Trace:** Redemption correctly links the subscription ID to the voucher row ([voucherService.js:184](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/voucherService.js#L184)) and creates a corresponding hotspot subscription ([voucherService.js:161](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/voucherService.js#L161)) which tracks usage properly.
*   **Concurrent Collision Handling:** High entropy (8 characters over a 31-character charset, `31^8 = 8.5 * 10^11` combinations) and DB-level unique constraint prevent duplicates ([Voucher.js:25](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/models/Voucher.js#L25)).
*   **Endpoints:** The polling endpoint contains strict phone-matching logic to prevent IDOR vulnerabilities ([voucherController.js:330](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/controllers/voucherController.js#L330)).

### 1.5 SMS / Dunning Layer
*   **Reminder Sent State:** Correctly resets `reminderSentAt` to `null` upon payment receipt to initiate the next cycle ([paymentService.js:415](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/paymentService.js#L415)).
*   **Retry & Backoff:** All notifications are enqueued via BullMQ with 3 retry attempts and exponential backoff ([queueManager.js:115-120](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/queue/queueManager.js#L115-L120)).
*   **Cost Tracking:** Parsed dynamically from the Africa's Talking API response rather than utilizing a static constant ([smsClient.js:95-100](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/sms/smsClient.js#L95-L100)).

### 1.6 Telemetry & Data Usage
*   🔴 **Critical (Expiry Check Query Starvation):** In [expireSubscriptions.js:36-48](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/jobs/expireSubscriptions.js#L36-L48), the SQL query fetches *all* active subscriptions without checking whether they are expired, but applies a database-level `limit: 100`. The code then filters these in memory for grace period expiration. At scale (more than 100 active users), this causes the sweep to continually fetch the same first 100 active subscriptions and filter them down. Because none of these first 100 are expired, the sweep does nothing, and actual expired users located beyond the first 100 records are never deactivated.
*   **Double Cutoff Protection:** Resolved. Both subscription-level and voucher-level data caps are unified in the `Subscription` model, avoiding race conditions or double-suspension issues ([accountingWatcher.js:207](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/jobs/accountingWatcher.js#L207)).
*   **Aggregation:** daily aggregation rows are written to the `data_usage` table inside the accounting watcher ([accountingWatcher.js:182-195](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/jobs/accountingWatcher.js#L182-L195)) for the AI microservice to query efficiently.

### 1.7 General Backend Code Quality
*   🟠 **High (Reversed Bandwidth Limits):** In [DataPlan.js:140](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/models/DataPlan.js#L140), `toMikrotikRateLimit` formats the rate-limit string as `downloadSpeed/uploadSpeed`. However, MikroTik RouterOS simple queues and RADIUS parse rate limits in `uploadSpeed/downloadSpeed` format. This swaps the upload and download speed limits on the router, restricting customer download rates to the upload limit.
*   🟡 **Medium (Silently Broken Startup):** The app does not validate required environment variables (such as `ROUTER_ENCRYPTION_KEY`, `JWT_SECRET`, or `AT_API_KEY`) at startup, boot-starting in a silently broken state.
*   🟡 **Medium (Mock-Heavy Tests):** The unit and integration tests heavily mock database models and transactions ([paymentService.test.js:6-31](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/tests/services/paymentService.test.js#L6-L31)). While they verify code path coverage, they fail to catch database-level constraints or dialect syntax bugs (like the `ASC NULLS FIRST` reconciliation error).

---

## **Backend Status: 🔴 2 critical, 4 high, 2 medium findings.**

---

## 2. DATABASE (MySQL)

*   🔴 **Critical (Migration Schema Drift):** The user migration script [20250709153814-create-user.js:6-12](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/migrations/20250709153814-create-user.js#L6-L12) defines the `id` column as an `autoIncrement` `Sequelize.INTEGER`. However, the Sequelize model file [User.js:7-11](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/models/User.js#L7-L11) defines the `id` column as `DataTypes.UUID`. If database migrations are executed via the Sequelize CLI in production, any insert of a UUID string into the integer column will fail or corrupt, preventing login and signup.
*   **Foreign Key Integrity:** Cascades are correctly limited. Plan and user deletions are guarded using `RESTRICT` constraints ([create-vouchers.js:25](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/migrations/20260714080100-create-vouchers.js#L25)).
*   **Index Coverage:** High-frequency indexes for status lookup are created ([Subscription.js:138](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/models/Subscription.js#L138)), but the expiry sweep lacks a compound index on `[status, end_date]`.
*   🟡 **Medium (Unbounded radacct Growth):** The FreeRADIUS accounting table `radacct` grows unbounded. Setup docs warn against truncation due to `SUM()` queries ([freeradius-setup.md:171](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/docs/freeradius-setup.md#L171)), but no partition or snapshot-based archiving mechanism is implemented.

---

## **Database Status: 🔴 1 critical, 0 high, 1 medium findings.**

---

## 3. REDIS / BULLMQ

*   🟠 **High (BullMQ Circuit Breaker Error):** In [provisioningWorker.js:187](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/queue/provisioningWorker.js#L187), the circuit breaker handles failures by catching errors in the worker `failed` event listener and attempting to reschedule the job using `job.moveToDelayed()`. In BullMQ, once a job fails, the lock token is invalidated, causing `moveToDelayed` to throw an error and fail to reschedule the job.
*   🟡 **Medium (No Queue Observability):** There is no dashboard or admin API visibility into BullMQ queue depth or failed job counts, making it impossible to detect queue backlogs without raw Redis CLI access.

---

## **Redis / BullMQ Status: 🟠 1 high, 1 medium findings.**

---

## 4. FREERADIUS

*   🟠 **High (FreeRADIUS Container Runs as root):** In [docker-compose.yml:158-160](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/docker-compose.yml#L158-L160), the FreeRADIUS service container is configured with `DB_USER=root` and `DB_PASSWORD=rootpassword`. This runs the RADIUS database connector as root rather than using the restricted `radius_user` database account recommended in setup guides.
*   **Accounting & Dynamic NAS:** SQL accounting query syntax is validated and supports Gigawords wrapping ([mods-enabled/sql:76-77](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/docker/freeradius/mods-enabled/sql#L76-L77)). Dynamic client loading works without config reload.
*   **Startup Verification:** Strong security checks block execution if default credentials are used ([entrypoint.sh:15](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/docker/freeradius/entrypoint.sh#L15)).

---

## **FreeRADIUS Status: 🟠 1 high, 0 medium findings.**

---

## 5. MIKROTIK / NETWORK LAYER (as testable)

*   🟡 **Medium (Mock client limits):** The mock client [mockClient.js](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/mikrotik/mockClient.js) does not simulate the `/queue/simple/print` command, meaning that simple queue-based bandwidth telemetry cannot be tested locally without custom overrides inside tests.

---

## **MikroTik Layer Status: 🟡 1 medium findings.**

---

## 6. AI SERVICE (Python / Flask)

*   🟡 **Medium (Spike Detection Granularity):** Spike detection operates on monthly aggregated data rather than daily usage ([data_fetcher.py:573](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/ai-service/services/data_fetcher.py#L573)). This prevents real-time alerting on daily data usage anomalies.
*   🟡 **Medium (Cold-Start Skip):** New customers with fewer than 2 months of history are silently skipped from anomaly checks ([anomaly_detector.py:146](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/ai-service/models/anomaly_detector.py#L146)).
*   **AI Claims:** Verified. Revenue MLR predictions and Churn models utilize actual numpy-fitted mathematical regression equations ([mlr_model.py:126](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/ai-service/models/mlr_model.py#L126)) and gradient descent ([churn_model.py:113-118](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/ai-service/models/churn_model.py#L113-L118)) rather than hardcoded rules.

---

## **AI Service Status: 🟡 2 medium findings.**

---

## 7. FRONTEND (React)

*   **Auth Separation:** Verified. In [adminRoutes.js:19](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/routes/adminRoutes.js#L19), the backend enforces role checks for every admin endpoint, rejecting customer JWTs server-side.
*   **Hotspot Login Handshake:** Fully implemented. Submits credentials directly to the router's login servlet ([Portal.js:262](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-frontend/src/pages/Portal.js#L262)).
*   **Voucher Print Flow:** Vouchers are exported as CSV files suitable for printing scripts ([voucherController.js:216](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/controllers/voucherController.js#L216)).

---

## **Frontend Status: 🟢 0 findings.**

---

## 8. CROSS-CUTTING SECURITY REVIEW

*   🔴 **Critical (M-Pesa Callback Spoofing):** The callback endpoint `/api/mpesa/callback` does not validate that incoming HTTP POST requests originate from Safaricom's IP range or verify any credentials/headers ([paymentValidation.js:207](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/middleware/paymentValidation.js#L207)). An attacker could query pending transactions and forge callback posts to activate subscriptions for free.

---

## **Security Status: 🔴 1 critical findings.**

---

## 9. OPERATIONAL READINESS

*   🔴 **Critical (No Backup or Key Recovery Plan):** There is no documented plan for key rotation, database backup, or recovery. If `ROUTER_ENCRYPTION_KEY` is lost or changed, all passwords in the `vouchers` and `subscriptions` tables will be permanently undecryptable.
*   🟡 **Medium (Missing Deployment Scripts):** In [DEPLOYMENT_INSTRUCTIONS.md:36](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/DEPLOYMENT_INSTRUCTIONS.md#L36), instructions require running `npm run migrate` and `npm run seed`, but these scripts are missing from the backend `package.json`.

---

## **Operational Status: 🔴 1 critical, 1 medium findings.**

---

## 10. SYSTEM AUDIT SUMMARY

| Severity | Subsystem | File:Line | Finding | Why it matters | Suggested fix |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 🔴 **Critical** | Backend | [expireSubscriptions.js:36](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/jobs/expireSubscriptions.js#L36) | Expiry sweep has a database `limit: 100` but no date filter in database. | Sweep gets stuck continually checking the same 100 active rows; actual expired records beyond row 100 are never processed. | Filter by expiration date in SQL query. |
| 🔴 **Critical** | Database | [create-user.js:6](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/migrations/20250709153814-create-user.js#L6) vs [User.js:7](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/models/User.js#L7) | Migration defines `id` as `INTEGER` while model defines it as `UUID`. | CLI-based migrations will fail to insert user records at startup, breaking production login/signup. | Align migrations with current model definitions. |
| 🔴 **Critical** | Security | [paymentValidation.js:207](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/middleware/paymentValidation.js#L207) | Callback endpoint `/mpesa/callback` has no IP or authorization validation. | Attacker can easily spoof M-Pesa callbacks, bypass billing, and activate services for free. | Add Safaricom IP allowlist checks or secure URL tokens. |
| 🔴 **Critical** | Operational | N/A | No backup/restore plan for `ROUTER_ENCRYPTION_KEY` or DB. | Changing/losing the encryption key destroys all encrypted router passwords, causing a complete lockout. | Create database export scripts and backup key guidelines. |
| 🔴 **Critical** | Backend | [paymentService.js:477](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/paymentService.js#L477) | Voucher generation triggered outside transaction with no retry. | If remote voucher creation fails, the payment stays committed but the user gets no voucher and no recovery path. | Move voucher generation inside transaction, or use a retry queue. |
| 🟠 **High** | Backend | [paymentService.js:92](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/paymentService.js#L92) | STK Push API call inside active DB transaction. | Held locks during external API call timeouts can exhaust the DB connection pool. | Commit transaction first, then initiate STK push. |
| 🟠 **High** | Backend | [reconcileProvisioning.js:48](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/jobs/reconcileProvisioning.js#L48) | Reconciliation ordering has SQL syntax error `ASC NULLS FIRST`. | SQL error breaks the provisioning reconciliation cron job on every run. | Remove `NULLS FIRST` and order standard ASC. |
| 🟠 **High** | Backend | [DataPlan.js:140](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/models/DataPlan.js#L140) | Rate limit formatted as `download/upload` instead of `upload/download`. | Swaps bandwidth speeds on router, limiting customer download speed to the lower upload cap. | Format string as `${uploadSpeedKbps}k/${downloadSpeedKbps}k`. |
| 🟠 **High** | Redis/BullMQ | [provisioningWorker.js:187](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/queue/provisioningWorker.js#L187) | Requeueing failed circuit jobs in event listener throws. | Failed job token is invalid in event handler; worker fails to reschedule open circuit jobs. | Perform `job.moveToDelayed` inside the processor before returning. |
| 🟠 **High** | FreeRADIUS | [docker-compose.yml:158](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/docker-compose.yml#L158) | FreeRADIUS container connects to DB as `root`. | Violates least privilege, exposing administrative DB power if container is compromised. | Configure FreeRADIUS to use the restricted `radius_user`. |
| 🟡 **Medium** | Backend | [app.js:9](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/app.js#L9) | App starts without environment validation. | Missing encryption key or passwords lead to silent failures and crashes at runtime. | Add startup environment validator script. |
| 🟡 **Medium** | Database | [freeradius-setup.md:171](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/docs/freeradius-setup.md#L171) | No automated pruning or archiving for `radacct` table. | Growing table slows down database queries over time. | Implement automated monthly data rollups and clean sweeps. |
| 🟡 **Medium** | Redis/BullMQ | N/A | Missing queue dashboard or status APIs. | Admin has no way to check BullMQ queue backlogs or failure rates. | Add BullMQ UI (e.g. Bull Board) or export monitoring health endpoints. |
| 🟡 **Medium** | AI Service | [data_fetcher.py:573](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/ai-service/services/data_fetcher.py#L573) | Spikes analyzed on monthly data instead of daily. | Spikes in daily usage will go unnoticed until the end of the month. | Fetch and analyze daily aggregated usage totals. |
| 🟡 **Medium** | AI Service | [anomaly_detector.py:146](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/ai-service/models/anomaly_detector.py#L146) | New customers skipped from anomaly checks. | Cold-start means new accounts have no anomaly coverage. | Use a cohort baseline fallback for new accounts. |
| 🟡 **Medium** | Operational | [DEPLOYMENT_INSTRUCTIONS.md:36](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/DEPLOYMENT_INSTRUCTIONS.md#L36) | Missing `migrate` and `seed` scripts in package.json. | Deployment guide scripts fail immediately on execution. | Add scripts to `package.json`. |

---

## 11. WHAT IS GENUINELY SOLID

1.  **AI Services (Numpy-fitted MLR and Logistic Churn):** The ML algorithms are implemented cleanly using Numpy/OLS and gradient descent rather than hardcoded logic.
2.  **API Security Boundary:** Backend routes enforce JWT authentication and role-based guards, rejecting customer tokens correctly on admin routes.
3.  **Dynamic NAS client loading:** FreeRADIUS is configured to dynamically check client definitions from database `nas` tables without requiring a restart.
4.  **FreeRADIUS Security Guard:** `entrypoint.sh` correctly rejects default weak secrets and short passwords, forcing strong credentials at launch.
5.  **Payment Status Guard (IDOR protection):** Public status querying requires matching phone parameters, preventing checkout request manipulation.

---

## 12. WHAT IS MISSING ENTIRELY

1.  **Automated Database Seeding inside Docker Compose:** Docker Compose starts MySQL empty without running `isp_seed.sql` inside `docker-entrypoint-initdb.d`, leaving the system without an initial admin account or plans.
2.  **Backup & Disaster Recovery Documentation:** No documented strategy for encryption key storage or database recovery in case of hardware failures.

---

## 13. TOP 10 PRIORITIZED ACTION ITEMS

1.  **Fix Expiry Sweep Database Query:** Filter by date in SQL to prevent job starvation at scale ([expireSubscriptions.js:36](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/jobs/expireSubscriptions.js#L36)).
2.  **Fix database/model migration schema drift:** Standardize ID primary keys as UUIDs across migrations and models ([create-user.js:6](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/migrations/20250709153814-create-user.js#L6)).
3.  **Implement Safaricom IP / token validation:** Secure the callback endpoint against spoofed payments ([paymentValidation.js:207](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/middleware/paymentValidation.js#L207)).
4.  **Fix reconciliation SQL syntax error:** Remove `NULLS FIRST` from order clause ([reconcileProvisioning.js:48](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/jobs/reconcileProvisioning.js#L48)).
5.  **Swap upload and download rate parameters:** Fix swapped bandwidth limits on the router ([DataPlan.js:140](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/models/DataPlan.js#L140)).
6.  **Fix BullMQ circuit breaker rescheduling:** Move `moveToDelayed` logic to worker processor ([provisioningWorker.js:187](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/queue/provisioningWorker.js#L187)).
7.  **Isolate STK Push API call:** Commit database transactions before calling external APIs ([paymentService.js:92](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/src/services/paymentService.js#L92)).
8.  **Restrict FreeRADIUS MySQL user privileges:** Avoid using DB root credentials in container configuration ([docker-compose.yml:158](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/docker-compose.yml#L158)).
9.  **Write backup/disaster recovery guidelines:** Create key documentation for `ROUTER_ENCRYPTION_KEY` preservation.
10. **Add missing scripts to package.json:** Ensure `npm run migrate` and `npm run seed` execute successfully ([package.json](file:///c:/Users/WARREN%20CHRIS/Desktop/ISP%20PROJECT/ISP-BILLING-SYSTEM/isp-billing-system-BACKEND/package.json)).
