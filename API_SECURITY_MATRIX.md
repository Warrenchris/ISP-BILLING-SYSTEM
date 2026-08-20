# API SECURITY MATRIX

**System:** ISP Billing, FreeRADIUS AAA & Automation Platform  
**Audit Stage:** Round 6 Complete Endpoint Security Inventory  
**Date:** August 20, 2026  

---

## 1. Authentication & User Management Endpoints (`/api/auth`)

| Endpoint | Method | Auth | Role Required | Tenant Scope | Rate Limit | Attack Test Result | Severity |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/auth/register` | `POST` | Public | None | Self | 15 req / 15 min | Schema validated; prevents privilege escalation via `role` override | 🟢 PASS |
| `/api/auth/login` | `POST` | Public | None | Self | 15 req / 15 min | Returns JWT; protected against password spraying & brute-force | 🟢 PASS |
| `/api/auth/forgot-password` | `POST` | Public | None | Self | 5 req / 15 min | Generates unhashed token in email; stores SHA-256 hash in DB | 🟢 PASS |
| `/api/auth/reset-password` | `POST` | Public | None | Self | 5 req / 15 min | Hashes incoming token before query; single-use invalidation verified | 🟢 PASS |
| `/api/auth/profile` | `GET` | Bearer | Any | `req.user.id` | Global | Returns authenticated user profile only | 🟢 PASS |
| `/api/auth/profile` | `PUT` | Bearer | Any | `req.user.id` | Global | Validates inputs; cannot overwrite role or balance | 🟢 PASS |
| `/api/auth/change-password`| `POST` | Bearer | Any | `req.user.id` | Global | Verifies old password before updating | 🟢 PASS |
| `/api/auth/logout` | `POST` | Bearer | Any | `req.user.id` | Global | Client clears token | 🟢 PASS |

---

## 2. Payment & Billing Endpoints (`/api/payments` & `/api/invoices`)

| Endpoint | Method | Auth | Role Required | Tenant Scope | Rate Limit | Idempotency / Transaction Lock | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/payments/subscription` | `POST` | Bearer | Customer | `req.user.id` | Global | `Payment.create` committed before STK; CheckoutRequestID bound | 🟢 PASS |
| `/api/payments/mpesa/initiate`| `POST` | Bearer | Any | `req.user.id` | Global | Executes `initiateDirectPayment`; creates DB record before STK | 🟢 PASS |
| `/api/payments/mpesa/callback/:token` | `POST` | Public (Token/IP) | None | Webhook | Global | Callback token & Safaricom IP verified; status check prevents replay | 🟢 PASS |
| `/api/payments/cash` | `POST` | Bearer | Admin | Global | Global | Transaction-wrapped; verifies target user exists | 🟢 PASS |
| `/api/payments/history` | `GET` | Bearer | Any | `req.user.id` | Global | Customer sees only own payments | 🟢 PASS |
| `/api/payments/:id` | `GET` | Bearer | Any | `userId: req.user.id` / Admin | Global | BOLA/IDOR protected: 403/404 if accessed by other customer | 🟢 PASS |
| `/api/invoices` | `GET` | Bearer | Any | `userId: req.user.id` / Admin | Global | Customers scoped to own invoices; Admin sees all | 🟢 PASS |
| `/api/invoices/:id` | `GET` | Bearer | Any | `userId: req.user.id` / Admin | Global | Customer querying other invoice gets 403 Forbidden | 🟢 PASS |
| `/api/invoices/:id/pdf` | `GET` | Bearer | Any | `userId: req.user.id` / Admin | Global | Streams generated PDF for authorized owner only | 🟢 PASS |

---

## 3. Subscription & Data Plan Endpoints (`/api/subscriptions` & `/api/data-plans`)

| Endpoint | Method | Auth | Role Required | Tenant Scope | Security Behavior | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/data-plans` | `GET` | Public / Auth | Any | Public Catalog | Returns active data plans with validity & prices | 🟢 PASS |
| `/api/data-plans` | `POST` | Bearer | Admin | Admin Only | Validates price, speed, data limit; creates plan | 🟢 PASS |
| `/api/subscriptions` | `POST` | Bearer | Customer | `req.user.id` | Admin/support barred from subscribing; one active plan limit | 🟢 PASS |
| `/api/subscriptions/current` | `GET` | Bearer | Customer | `req.user.id` | Returns active plan with days & data remaining | 🟢 PASS |
| `/api/subscriptions/history` | `GET` | Bearer | Customer | `req.user.id` | Scoped to `userId: req.user.id` | 🟢 PASS |
| `/api/subscriptions/:id/cancel` | `POST` | Bearer | Customer / Admin | `userId: req.user.id` | Checks ownership; transitions to `cancelled` | 🟢 PASS |

---

## 4. Voucher Management Endpoints (`/api/vouchers`)

| Endpoint | Method | Auth | Role Required | Concurrency / Locking Mechanism | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/api/vouchers/redeem` | `POST` | Bearer | Customer | `transaction.LOCK.UPDATE` exclusive row lock prevents double-redemption | 🟢 PASS |
| `/api/vouchers/purchase-stk` | `POST` | Bearer | Customer | Creates DB Payment row before STK; activates voucher on callback | 🟢 PASS |
| `/api/vouchers/generate` | `POST` | Bearer | Admin | Dispatches batch generation job to BullMQ queue | 🟢 PASS |
| `/api/vouchers/batch/:batchId` | `GET` | Bearer | Admin | Retrieves batch voucher list with status and export options | 🟢 PASS |

---

## 5. AI Microservice Endpoints (`/api/ai`)

| Endpoint | Method | Auth | Authorization Scope | Internal Protection | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/api/ai/chat` | `POST` | Bearer | `req.user.id === customerId` | Node reverse proxy injects `X-Internal-Service-Key` | 🟢 PASS |
| `/api/ai/predict-revenue` | `POST` | Bearer | Admin, Support | MLR revenue forecasting model | 🟢 PASS |
| `/api/ai/churn-risks` | `GET` | Bearer | Admin, Support | NumPy logistic regression subscriber churn risks | 🟢 PASS |
| `/api/ai/anomalies` | `GET` | Bearer | Admin, Support | Z-score usage spike detector & proactive alert trigger | 🟢 PASS |
| `/api/ai/dashboard-summary`| `GET` | Bearer | Admin, Support | Aggregated AI metrics summary | 🟢 PASS |
| `/api/ai/health` | `GET` | Public | Container Health | Returns AI model weights status and Groq API readiness | 🟢 PASS |

---

## 6. Support & Network Automation Endpoints

| Endpoint | Method | Auth | Role Required | IDOR / Access Control Validation | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/api/support/tickets` | `GET` | Bearer | Any | Scopes to `userId: req.user.id` for customers; all for support/admin | 🟢 PASS |
| `/api/support/tickets/:id` | `GET` | Bearer | Any | Checks `ticket.userId === req.user.id`; 403 Forbidden on violation | 🟢 PASS |
| `/api/support/tickets/:id/replies` | `POST` | Bearer | Any | Checks ownership before appending reply; notifications dispatched | 🟢 PASS |
| `/api/network-devices` | `GET` | Bearer | Admin | Admin-only router and NAS configuration list | 🟢 PASS |
| `/api/network-devices/:id/test` | `POST` | Bearer | Admin | Tests RouterOS API connection with timeout & circuit breaker | 🟢 PASS |
