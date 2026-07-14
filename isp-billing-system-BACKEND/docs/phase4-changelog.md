# Phase 4 Changelog — Client Self-Service & Captive Portal

**Date:** 2026-07-14
**Goal:** Deliver a React-based public captive portal, automated hotspot handshake form submittals, phone-keyed dynamic customer generation, and rate-limiting NAT protections.

---

## Summary

Phase 4 integrates client-facing interfaces with core payment and provisioning AAA backends:
- **Public Captive Portal (`Portal.js`)**: Glassmorphic layout for code redemption and remote voucher purchase.
- **Hotspot Login Handshake**: Form-POST redirect back to router gateway servlet, MAC-binding client session.
- **IDOR Safeguards**: Phone-number matching validation on payment-status queries.
- **NAT IP Rate Limiting**: Combines IP and Phone attributes to prevent gateway spam without NAT blockages.
- **Phone-Keyed Dynamic Accounts**: Generates unique guest accounts per phone number, preserving analytics.
- **Self-Service Navigation Controls**: Gated sidebar views and ticket filtering for customer roles.

---

## New Files

### Frontend Pages
| File | Description |
|------|-------------|
| `src/pages/Portal.js` | Glassmorphic hotspot portal. Redirection, M-Pesa purchases, polling, and auto-handshakes |

### Database Migrations
*(None required: Dynamic phone-keyed accounts reuse the existing User schema, and voucherCode metadata is saved inside the existing Payment JSON column).*

---

## Modified Files

### Backend (Node.js + Express)
| File | Changes |
|------|---------|
| `src/services/paymentService.js` | Added `initiateVoucherPurchaseStk` and `getOrCreatePhoneUser` helpers; merges callbackData and triggers voucher delivery |
| `src/controllers/voucherController.js` | Implemented `initiatePurchaseStk` and `queryVoucherPaymentStatus` with IDOR validation |
| `src/routes/voucherRoutes.js` | Exposed public purchase routes under NAT-safe IP + phone rate limiters |

### Frontend (React)
| File | Changes |
|------|---------|
| `src/App.js` | Registered public route `/portal` |
| `src/components/Layout/Sidebar.js` | Restricted customer role views to Dashboard and Support Tickets |

---

## Environment Variables

No new environment variables are required. Existing `VOUCHER_CODE_LENGTH` and `VOUCHER_BRUTE_FORCE_LIMIT` apply normally.

---

## Verification Plan

Verified compilation, triggers, and execution flows:
```bash
npx jest --testPathPattern="voucherPurchase" --no-cache --forceExit
```
Outputs: `5 passed, 5 total`.

Frontend production build check:
```bash
npm run build
```
Outputs: `Compiled successfully`.
