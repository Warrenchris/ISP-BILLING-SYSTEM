# PRODUCTION REMEDIATION BASELINE

**Date:** August 20, 2026  
**Auditor / Lead Engineer:** SRE & Security Engineering  
**Baseline Status:** Pre-Remediation Established  

---

## 1. Executive Summary of Baseline

| Component | Status | Metrics / Results | Known Defects / Blockers |
| :--- | :---: | :--- | :--- |
| **Frontend Web App** | 🟢 **BUILDS** | Webpack 5 production build succeeded (524.93 kB gzip bundle). | Runtime error on password reset (`alpha is not defined`); missing `/reset-password/:token` route; dead-end `/mpesa/initiate` payment modal. |
| **Backend Unit Tests** | 🟢 **PASSING** | 12/12 Test Suites, 72/72 Tests Passed in 42.5s. | No automated test coverage for password reset token hashing or `/mpesa/initiate` database insertion. |
| **Backend Integration** | 🟢 **PASSING** | 8/8 Test Suites, 51/51 Tests Passed (in-band against MySQL 8). | Database dropped during parallel execution unless run sequentially. |
| **AI Microservice** | 🟡 **OPERATIONAL** | Flask + NumPy logistic/linear regression models operational. | Zero unit test suite; host port `5001` exposed without authentication. |
| **Docker Composition** | 🔴 **BLOCKED** | `docker compose up` crashes on root `.env` interpolation. | Missing `DB_PASSWORD` in root `.env`; ports 5001, 6379, 3307 bound to `0.0.0.0`; empty Redis password. |

---

## 2. Identified Production Blockers to Remediate

1. **[P0] Password Reset Lifecycle Failure:**
   - Raw vs SHA-256 hashed token lookup mismatch in `authRoutes.js`.
   - Missing `alpha` import in `ResetPassword.js`.
   - Missing route `/reset-password/:token` in `App.js`.
2. **[P1] Dead-End M-Pesa STK Route (`/api/payments/mpesa/initiate`):**
   - Dispatches STK without database `Payment` record; callbacks dropped.
3. **[P1] Docker Network Exposure & Port Security:**
   - Ports 5001 (AI), 6379 (Redis), and 3307 (MySQL) exposed on `0.0.0.0`.
   - Empty `REDIS_PASSWORD=""`.
4. **[P1] AI Microservice Service-Level Authorization:**
   - Unauthenticated direct access to Flask on internal/external network.
5. **[P1] Missing Auth Route Rate Limiting:**
   - No dedicated rate limiters on `/api/auth/login`, `/register`, `/forgot-password`, `/reset-password`.
6. **[P1] Docker Root `.env` Interpolation Failure:**
   - Incomplete `.env.example` and missing environment variables causing container launch failure.
7. **[P2] Missing Disaster Recovery / Automated Backup Procedure:**
   - No database backup and restore scripts.

---

## 3. Remediation Order

- **Phase 1:** Password Reset Lifecycle (Backend token hashing + Frontend route and imports + automated Jest tests)
- **Phase 2:** M-Pesa Payment Route (Unify `/api/payments/mpesa/initiate` into safe `Payment` creation flow + Frontend integration)
- **Phase 3 & 4:** Network Isolation & AI Service Authorization (Internal service secret header + port binding cleanup)
- **Phase 5 & 6:** Redis & MySQL Security (Enforce password + 127.0.0.1 host binding)
- **Phase 7 & 8:** Docker Environment & Secret Sanitization (`.env.example` alignment)
- **Phase 9:** Dedicated Auth Route Rate Limiting
- **Phase 10:** Automated Backup & Restore Utilities
- **Phase 11 & 12:** Full Regression & Security Verification
