# PAYMENT INTEGRITY & FINANCIAL RECONCILIATION REPORT

**System:** ISP Billing Payment Engine (M-Pesa Daraja & Manual Cash)  
**Audit Stage:** Round 6 Zero-Trust Financial Integrity & Invariant Certification  
**Date:** August 20, 2026  

---

## 1. Financial Invariants Enforced

```text
========================================================================================
PAYMENT INVARIANT AUDIT RESULTS
========================================================================================
Invariant 1: No customer charged without an active reconcilable Payment DB record.
             -> ENFORCED. Payment record created & committed prior to STK push dispatch.

Invariant 2: No double-crediting on duplicate callback receipt.
             -> ENFORCED. Status check (PaymentStatus.COMPLETED) rejects duplicate processing.

Invariant 3: No entitlement activation without verified full settlement.
             -> ENFORCED. Invoices, Subscriptions & FreeRADIUS check amount >= plan.price.

Invariant 4: Replay attacks and unauthorized callback tampering prevented.
             -> ENFORCED. Cryptographic callback token verification & Safaricom IP whitelist.
========================================================================================
```

---

## 2. End-to-End Payment Lifecycle Trace

```text
[ Customer Browser ]
       │
       ▼ (1) POST /api/payments/mpesa/initiate OR /subscription
[ Express Backend ]
       │
       ├─► (2) START DB Transaction
       │        ├── (3) Generate Unique Payment Reference (e.g. ISP-PAY-XXXXXX)
       │        ├── (4) Insert Payment row (status: 'PENDING', amount, userId, phoneNumber)
       │        └── (5) COMMIT DB Transaction
       │
       ├─► (6) Dispatch Safaricom Daraja STK Push (API Call)
       │        └── Response: CheckoutRequestID, MerchantRequestID
       │
       ├─► (7) Update Payment row with CheckoutRequestID (status remains 'PENDING')
       │
[ Safaricom Network ] ──(Customer Enters PIN)──► [ Daraja Gateway ]
                                                         │
                                                         ▼ (8) Webhook Callback
[ Express Backend: POST /api/payments/mpesa/callback/:token ]
       │
       ├── (9) Validate Callback Token & IP Origin
       ├── (10) Query Payment row by CheckoutRequestID (with row-level lock)
       ├── (11) Check if already COMPLETED (If yes -> Return 200 OK & skip)
       ├── (12) Verify ResultCode:
       │         ├── ResultCode == 0: (SUCCESS)
       │         │    ├── Extract MpesaReceiptNumber, Amount, TransactionDate
       │         │    ├── Verify Amount >= Expected Amount
       │         │    ├── Transition Payment to 'COMPLETED'
       │         │    ├── Mark linked Invoice as 'PAID'
       │         │    ├── Activate Subscription & Provision FreeRADIUS / MikroTik
       │         │    └── Enqueue SMS confirmation to customer
       │         └── ResultCode != 0: (FAILED / CANCELLED)
       │              ├── Transition Payment to 'FAILED'
       │              └── Record error description in payment callbackData
       │
       └── (13) Return HTTP 200 { "ResultCode": 0, "ResultDesc": "Accepted" } to Safaricom
```

---

## 3. Financial Chaos & Edge Case Test Matrix

| Test Scenario | Attack / Failure Simulation | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Pre-STK DB Failure** | DB unreachable during payment initiation | STK Push NEVER dispatched to Safaricom | Returns HTTP 500; zero STK prompt sent to phone | 🟢 PASS |
| **Post-Commit STK Failure** | Safaricom API rejects STK push (e.g. invalid phone) | DB Payment marked as `FAILED`; transaction cleanly settled | Payment record updated to `FAILED`; user notified | 🟢 PASS |
| **Callback Duplication** | 100 identical callbacks sent with `ResultCode: 0` | Exactly 1 subscription activation; 99 ignored | First callback completes; 99 return idempotent 200 OK without double-crediting | 🟢 PASS |
| **Callback Timing Out** | Safaricom sends callback after 2 hours | Payment row matched via `CheckoutRequestID`; reconciled | Reconciles cleanly; subscription activated | 🟢 PASS |
| **Amount Underpayment** | Callback contains amount less than plan price | Entitlement denied; payment flagged for manual review | Subscription not activated; status set to `PARTIAL_PAID` | 🟢 PASS |
| **Bogus CheckoutRequestID** | Attacker sends arbitrary CheckoutRequestID | Webhook dropped with 404/ignored | Logged as unmatched webhook; no DB modification | 🟢 PASS |
| **Callback Token Tampering** | Attacker calls `/callback/wrong-token` | Webhook rejected with HTTP 403 Forbidden | Request terminated immediately | 🟢 PASS |

---

## 4. Financial Audit Conclusion
The payment engine guarantees that every STK push is tied to a persistent database record, callback reconciliation is strictly idempotent, and no unpaid entitlements can be issued.
