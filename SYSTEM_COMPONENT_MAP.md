# SYSTEM COMPONENT MAP & ARCHITECTURAL INVENTORY

**System:** ISP Billing, FreeRADIUS AAA, MikroTik Automation, Voucher Management, M-Pesa Payments & AI Microservice  
**Audit Round:** Round 6 Zero-Trust Comprehensive Certification  
**Date:** August 20, 2026  

---

## 1. Top-Level Service Topology

```text
[ Client Browser / Portal (React SPA :3001) ]
                  │
                  ▼ (REST / JSON)
[ Reverse Proxy / TLS Gateway (:443 -> :3000) ]
                  │
                  ▼
[ Express.js Backend API Core (:3000) ]
       │            │              │             │
       │            │              │             ▼
       │            │              │    [ Groq LLaMA 3.1 LLM Cloud ]
       │            │              │             ▲
       │            │              │             │ (REST / API Key)
       │            │              ▼             │
       │            │    [ Python Flask AI Service (:5001) ]
       │            │              │
       │            ▼              ▼
       │     [ Redis 7 (:6379) / BullMQ Workers ]
       │            │
       ▼            ▼
[ MySQL 8.0 Primary DB (:3306) ] ◄───► [ FreeRADIUS 3.0 (:1812/:1813 UDP) ]
       ▲
       │ (RADIUS Auth / Acct)
[ MikroTik RouterOS Gateway (PPPoE / Hotspot NAS) ]
```

---

## 2. Component Inventory & Specification

### 2.1 Web Frontend (`isp-billing-frontend`)
- **Technology:** React 18, Material UI (MUI v5), Axios, React Router v6.
- **Port:** `3001` (Host) -> `3000` (Container internal).
- **Authentication:** Bearer JWT in `localStorage`, injected via Axios interceptor in `src/utils/api.js`.
- **Primary Views:** Customer Portal, Admin Dashboard, Subscriptions, Payments, Invoices, Support Tickets, Data Usage Analytics, Vouchers, AI Assistant, Network Devices, SMS Logs, Queue Health.
- **Error Handling:** Centralized notification snackbar (`NotificationContext`), ProtectedRoute guards.

### 2.2 Core Backend (`isp-billing-system-BACKEND`)
- **Technology:** Node.js (v18+), Express 4, Sequelize ORM 6, Winston Logger.
- **Port:** `3000` (Host & Container).
- **Middleware:** `helmet`, `cors`, `rateLimiter` (route-specific), `authenticate`, `authorize`, `validateRequest`.
- **Database Connection:** MySQL Connection Pool (max: 20 connections, min: 2, acquire: 30000ms, idle: 10000ms).
- **Core Controllers (19):** Auth, Admin, Billing, DataPlan, DataUsage, Invoice, MikroTik, Notification, Payment, Report, Setting, Sms, Subscription, Support, Usage, User, Voucher, QueueHealth, Session.

### 2.3 AI Microservice (`ai-service`)
- **Technology:** Python 3.11, Flask 3.0, NumPy, Scikit-Learn, Groq SDK.
- **Port:** `127.0.0.1:5001` (Restricted to localhost / internal Docker mesh).
- **Authentication:** Service-mesh shared key header (`X-Internal-Service-Key`).
- **Internal Modules:**
  1. `predict_revenue` (Multivariable Linear Regression)
  2. `churn_risks` (NumPy Logistic Regression Churn Classifier)
  3. `anomalies` (Z-Score Bandwidth Anomaly Detector)
  4. `chat` (Groq LLaMA 3.1 LLM grounded on active customer SQL context)
  5. `retrain` (Automated weight optimizer)

### 2.4 Distributed Cache & Job Queue (`isp-redis`)
- **Technology:** Redis 7 Alpine, BullMQ 5.
- **Port:** `127.0.0.1:6379`.
- **Queues Managed:**
  1. `provisioning-queue`: MikroTik PPPoE/Hotspot queue creation, speed profile enforcement.
  2. `voucher-queue`: High-volume voucher code generation, cryptographic hashing, and batch insertion.
  3. `sms-queue`: Asynchronous SMS dispatch via Africa's Talking / Mock gateway with rate limiting and retry backoff.
  4. `dunning-queue`: Grace period expiration and automated suspension notifications.
  5. `reconciliation-queue`: Background sweep for orphaned M-Pesa transactions.

### 2.5 Database Tier (`isp-mysql`)
- **Technology:** MySQL 8.0 Community Server.
- **Storage Engine:** InnoDB with row-level locking (`transaction.LOCK.UPDATE`) and ACID transaction isolation.
- **Port:** `127.0.0.1:3307` (Host mapping for local tools) -> `3306` (Container internal).
- **Schema:** 26 sequential migrations covering `users`, `data_plans`, `subscriptions`, `payments`, `invoices`, `invoice_items`, `vouchers`, `data_usage`, `network_devices`, `support_tickets`, `ticket_replies`, `sms_logs`, `audit_logs`, and FreeRADIUS AAA tables (`radcheck`, `radreply`, `radusergroup`, `radgroupcheck`, `radgroupreply`, `radacct`, `radpostauth`, `nas`).

### 2.6 FreeRADIUS AAA Engine (`isp-freeradius`)
- **Technology:** FreeRADIUS 3.0, `rlm_sql_mysql`.
- **Ports:** `1812/udp` (Authentication), `1813/udp` (Accounting).
- **Shared Secret:** Configured in `clients.conf` / `docker-compose.yml`.
- **Lifecycle Integration:** User credentials synchronized upon subscription creation/activation; deactivated upon expiry; session byte counts tracked in `radacct` and mirrored to `data_usage`.

### 2.7 MikroTik RouterOS Automation
- **Protocol:** RouterOS API (`/interface/pppoe-server`, `/ip/hotspot`, `/queue/simple`).
- **Resilience:** Circuit Breaker pattern with exponential backoff and mock fallback (`MOCK_MIKROTIK=true`).
- **Security:** Credentials stored with AES-256 encryption (`ROUTER_ENCRYPTION_KEY`).

---

## 3. Security Boundary & Data Flow Map

```text
[Public Internet]
       │ (HTTPS Only via Reverse Proxy)
       ▼
[Express Backend] ──(Shared Secret Mesh)──► [Flask AI Service]
       │                                            │
       ├──(Authenticated Redis Protocol)──► [Redis] │
       │                                            ▼
       └───────────────────────────────────► [MySQL DB] ◄── [FreeRADIUS Engine]
```
