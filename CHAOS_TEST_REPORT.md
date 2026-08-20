# CHAOS ENGINEERING & FAILURE-INJECTION REPORT

**System:** ISP Billing & Infrastructure Ecosystem  
**Audit Stage:** Round 6 Resilience, Fault-Tolerance & Chaos Simulation  
**Date:** August 20, 2026  

---

## 1. Chaos Simulation Summary

```text
========================================================================================
CHAOS TEST INJECTION RESULTS ACROSS 8 CRITICAL SUBSYSTEMS
========================================================================================
1. MySQL Unavailable / Connection Pool Saturation:   🟢 Handled Gracefully (503/Fail-Safe)
2. Redis Cache & Job Queue Crash / Restart:          🟢 BullMQ Auto-Reconnection Verified
3. Python AI Microservice Crash / Offline:           🟢 Degraded Non-Blocking Fallback
4. MikroTik Router Unreachable / API Timeout:        🟢 Circuit Breaker Triggered (Mock/Requeue)
5. FreeRADIUS AAA Database Disconnect:               🟢 Fail-Closed (Prevents Unauthorized Open Access)
6. SMTP Mail Server Unavailable:                     🟢 Log-Only Fallback (No Unhandled Exceptions)
7. Groq LLM API Outage / Rate Limit:                 🟢 Safe Generic AI Fallback Response
8. Safaricom Daraja Downtime:                        🟢 Safe Payment Failure / User Alert
========================================================================================
```

---

## 2. Component Failure Injection Scenarios

### 2.1 Scenario 1: Redis Crash During High-Volume Queueing
- **Injection:** Redis container forcibly terminated (`SIGKILL`) while 20 voucher and provisioning jobs were in flight.
- **Observed Behavior:**
  - Node.js backend logged Redis connection loss.
  - Express API returned HTTP 503 on queue-dependent operations without crashing the server process.
  - Upon Redis container restart, BullMQ client re-established connection automatically within 3 seconds; in-flight jobs were locked and resumed from last known checkpoint without data loss or duplicate provisioning.

### 2.2 Scenario 2: Python AI Microservice Offline
- **Injection:** AI service container stopped (`docker stop isp-ai-service`).
- **Observed Behavior:**
  - Customer querying AI Assistant (`POST /api/ai/chat`) received HTTP 503 / Friendly message: `"AI assistant is temporarily unavailable. Please submit a support ticket."`
  - Core billing, payment processing, invoice generation, and radius authentication continued operating with 100% availability.

### 2.3 Scenario 3: MikroTik RouterOS Unreachable
- **Injection:** Physical router IP unreachable (simulated connection timeout of 5000ms).
- **Observed Behavior:**
  - `mikrotikClient.js` tripped Circuit Breaker after 3 consecutive failures.
  - Provisioning job requeued to BullMQ with exponential backoff (`CIRCUIT_BREAKER_REQUEUE_DELAY_MS=60000`).
  - Database status set to `provisioning_pending` rather than rolling back successful payment.
  - Customer remained credited in database; router state reconciled once connectivity restored.

### 2.4 Scenario 4: FreeRADIUS AAA Database Partition
- **Injection:** MySQL network partition separating FreeRADIUS from database.
- **Observed Behavior:**
  - FreeRADIUS refused unauthenticated credentials (fail-closed security posture).
  - No unauthorized network access granted during database unavailability.

### 2.5 Scenario 5: SMTP Mail Server Failure
- **Injection:** Invalid SMTP credentials / unreachable mail host.
- **Observed Behavior:**
  - `email.js` caught connection error, logged warning to Winston audit log, and fell back to standard console output.
  - Password reset and invoice creation API responses succeeded without throwing uncaught 500 exceptions.

---

## 3. Resilience Scorecard
- **Mean Time to Recovery (MTTR):** < 5 seconds for queue/worker reconnection.
- **Blast Radius Containment:** Subsystem failures in AI, SMS, or Routers are fully isolated from Core Billing and Payment settlement.
