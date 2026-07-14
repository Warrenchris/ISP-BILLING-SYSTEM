# Client Self-Service & Captive Portal Setup Guide — Phase 4

This document details the configuration, routing mechanisms, and security structures for the React Captive Portal and Customer Self-Service layouts implemented in Phase 4.

---

## 1. Captive Portal Hotspot Redirection

When a hotspot user connects to the WiFi, the MikroTik router intercepts their web traffic and redirects them to the Captive Portal at `/portal` along with standard query parameters.

### Redirection Query Parameters
- `link-login-only` (or `link-login`): The target URL of the router's login servlet, e.g. `http://10.5.50.1/login` or `http://192.168.88.1/login`.
- `mac`: Client's physical MAC address (e.g. `00:11:22:33:44:55`).
- `ip`: Client's local IP address (e.g. `10.5.50.15`).
- `dst`: The destination website the user originally wanted to visit (e.g. `http://google.com`).
- `error`: Error codes or details redirected from failed login attempts.

### MikroTik Configuration (walled-garden)
To ensure the captive portal loads before the user is authenticated, administrators must add the portal domain/IP to the MikroTik hotspot **walled garden** configuration:

```routeros
/ip hotspot walled-garden
add dst-host=your-portal-domain.com action=allow
add dst-host=your-api-domain.com action=allow
# Safaricom M-Pesa domains must also be allowed for STK push prompts:
add dst-host=*.safaricom.co.ke action=allow
add dst-host=*.africastalking.com action=allow
```

---

## 2. Hotspot Login Handshake (RouterOS POST)

Once a voucher code is successfully redeemed (either entered directly or generated after an M-Pesa purchase), the portal automatically bypasses manual login prompts:

1. The portal constructs a hidden HTML `<form>` targeting the `link-login-only` URL parsed from the query string (defaults to `http://10.5.50.1/login` if missing).
2. The form includes the following inputs:
   - `username`: The redeemed voucher code.
   - `password`: The generated RADIUS password (retrieved from the redeem response).
   - `dst`: The original destination URL (`dst`).
   - `popup`: `true`.
3. The React app auto-submits this form. The router registers the client's MAC address, grants access, and forwards them to their target destination website (`dst`).

---

## 3. Telemetry Integrity: Phone-Keyed Guest Accounts

Instead of linking all anonymous voucher purchases to a single static guest record, which would pollute analytics and break the Phase 5 AI anomaly models, the system dynamically registers phone-keyed accounts.

### Dynamic Generation Flow
- When a guest starts an STK purchase, the backend checks for a user record matching their `phoneNumber`.
- If one exists, the purchase is linked to their ID.
- If not, a user record is generated dynamically:
  - Email: `guest-<phone>@isp.com`
  - Name: `Hotspot Guest`
  - Role: `customer`
This preserves reporting metrics, segmenting telemetry and payments accurately per phone subscriber.

---

## 4. Polling Security: IDOR Safeguards

Voucher retrieval polling is protected against IDOR (Insecure Direct Object Reference) leaks:

- **Endpoint**: `GET /api/vouchers/payment-status/:paymentId?phone=...`
- **Verification Guard**: The request is unauthenticated, but requires the query parameter `phone`.
- The backend matches `phone` against the phone number stored in the target `Payment` record.
- Mismatches return `403 Forbidden` immediately, preventing attackers from harvesting voucher codes by guessing payment IDs.

---

## 5. NAT-Safe Rate Limiting (Spam Mitigation)

Captive portal users share a single NAT'd IP behind the hotspot. Standard IP-based rate limiting would block legitimate buyers when one user spams.

### Key Generator
The STK push route `/api/vouchers/purchase-stk` utilizes a combined key generator:
```javascript
keyGenerator: (req) => req.ip + '_' + (req.body.phone || '')
```
This restricts rate-limits (max 3 STK prompts per minute) to a specific NAT'd user's IP **and** phone number combination, protecting Safaricom gateways from spam without interrupting other users.

---

## 6. Client Self-Service Navigation & Ticket Guards

Authenticated users logging in with `role: 'customer'` are restricted to client-only layouts:

- **Sidebar Gating**: The frontend filters the sidebar to display only **Dashboard**, **Profile**, and **Support Tickets**. Admin options (Staff, Settings, AI, Audit logs) are hidden.
- **Support Ticket Filters**:
  - Frontend: Filters ticket listings to show only tickets created by the user.
  - Backend: Route middleware enforces `where.userId = req.user.id` on support requests, preventing customers from accessing other tickets.
