# MikroTik RouterOS Setup Guide — ISP Billing System Phase 1

This document covers the router-side configuration required for the ISP Billing System's
automated provisioning to work. All commands are for **RouterOS v7**.

---

## Table of Contents

1. [Enable the RouterOS API Service](#1-enable-the-routeros-api-service)
2. [Create a Dedicated API User](#2-create-a-dedicated-api-user)
3. [Firewall Address-List Strategy Setup](#3-firewall-address-list-strategy-setup)
4. [PPPoE Strategy Setup](#4-pppoe-strategy-setup)
5. [Hotspot Strategy Setup](#5-hotspot-strategy-setup)
6. [RADIUS Client (Prep for Phase 2)](#6-radius-client-prep-for-phase-2)
7. [Encryption Key Management](#7-encryption-key-management)
8. [Security Recommendations](#8-security-recommendations)

---

## 1. Enable the RouterOS API Service

The ISP Billing System communicates with MikroTik via the RouterOS API (port 8728 for
plain, 8729 for TLS/API-SSL).

### Enable plain API (development/internal networks):

```routeros
/ip service set api address=0.0.0.0/0 disabled=no port=8728
```

### Enable API-SSL (recommended for production):

```routeros
# First, ensure you have an SSL certificate (self-signed or CA-signed)
/certificate add name=api-cert common-name=router.example.com days-valid=3650 key-size=2048
/certificate sign api-cert

# Enable API-SSL
/ip service set api-ssl address=0.0.0.0/0 disabled=no port=8729 certificate=api-cert

# Optionally disable plain API for security
/ip service set api disabled=yes
```

### Restrict API access to your billing server's IP:

```routeros
# Replace 10.0.0.100 with your billing server's IP
/ip service set api address=10.0.0.100/32
/ip service set api-ssl address=10.0.0.100/32
```

---

## 2. Create a Dedicated API User

Never use the default `admin` account for API access. Create a dedicated user with
restricted permissions.

```routeros
# Create a group with only the permissions needed by the billing system
/user group add name=billing-api policy=read,write,api,!ftp,!ssh,!telnet,!winbox,!web,!reboot,!policy,!password,!sensitive

# Create the API user
/user add name=isp-billing password=YOUR_STRONG_PASSWORD group=billing-api
```

> **⚠️ Important:** The password you set here is the one you'll enter when adding the
> router via `POST /api/admin/network-devices`. It will be encrypted with AES-256-GCM
> before storage in MySQL — the plaintext never touches the database.

---

## 3. Firewall Address-List Strategy Setup

This strategy blocks internet access by adding customer IPs to a firewall address-list.
Customers in the list are denied access; removing them restores access.

### Step 1: Create the firewall filter rule

```routeros
# Create a drop rule for the "cutoff-list" address-list
# Place this rule BEFORE your default accept/masquerade rules
/ip firewall filter add chain=forward \
    src-address-list=cutoff-list \
    action=reject \
    reject-with=icmp-admin-prohibited \
    comment="ISP Billing: Block cutoff-list customers" \
    place-before=0

# Optional: Also block DNS so the customer sees a clear "no internet" error
/ip firewall filter add chain=forward \
    src-address-list=cutoff-list \
    protocol=udp \
    dst-port=53 \
    action=reject \
    reject-with=icmp-admin-prohibited \
    comment="ISP Billing: Block DNS for cutoff-list" \
    place-before=0
```

### Step 2: Verify the rule is in place

```routeros
/ip firewall filter print where comment~"ISP Billing"
```

### Notes:
- The address-list name must match the `cutoffAddressList` value you set when adding
  the router via the admin API (default: `cutoff-list`).
- The billing system adds/removes entries from this list automatically.
- You can have different list names per router (multi-site support).

---

## 4. PPPoE Strategy Setup

For PPPoE customers, the billing system enables/disables their PPPoE secret (username)
directly via the API.

### Naming convention

PPPoE secrets should match the `networkIdentifier` stored in the subscription record.
Recommended: use the customer's phone number or a standardized username format.

```routeros
# Example: creating a PPPoE secret (normally done once during customer installation)
/ppp secret add name=0712345678 password=customer_pass service=pppoe-server \
    profile=default-customer comment="John Doe - Plan: Home 10Mbps"
```

### What the billing system does automatically:
- **Disable (cutoff):** Sets `disabled=yes` on the PPPoE secret AND force-drops any
  active PPPoE session so disconnection is immediate.
- **Enable (reconnect):** Sets `disabled=no` on the PPPoE secret. The customer's CPE
  will automatically retry and reconnect (PPPoE clients typically retry every 5-30s).

### Required: PPPoE server must be configured

```routeros
# Verify you have a PPPoE server running
/interface pppoe-server server print
```

---

## 5. Hotspot Strategy Setup

For Hotspot customers, the billing system blocks/unblocks them via IP bindings.

### How it works:
- **Disable:** Adds an IP binding with `type=blocked` for the customer's IP/MAC
  and drops their active hotspot session.
- **Enable:** Removes the blocked IP binding.

### Required: Hotspot server must be configured

```routeros
# Verify you have a Hotspot server running
/ip hotspot print
```

### Captive portal redirect (Phase 4 prep):

```routeros
# When you set up the captive portal in Phase 4, you'll point the hotspot
# login page to your billing system's captive portal URL
/ip hotspot profile set default login-by=https html-directory-override=""
# The actual redirect URL will be configured in Phase 4
```

---

## 6. RADIUS Client (Prep for Phase 2)

This is not needed for Phase 1 but is documented here so you can pre-configure it.

```routeros
# Add your FreeRADIUS server as a RADIUS client
/radius add service=ppp,hotspot,login \
    address=YOUR_RADIUS_SERVER_IP \
    secret=YOUR_SHARED_SECRET \
    timeout=3000

# Enable RADIUS for PPPoE
/ppp aaa set use-radius=yes accounting=yes interim-update=5m

# Enable RADIUS for Hotspot
/ip hotspot profile set default use-radius=yes
```

---

## 7. Encryption Key Management

### Generating the key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This produces a 64-character hex string (32 bytes). Add it to your `.env`:

```
ROUTER_ENCRYPTION_KEY=a1b2c3d4e5f6...your64charhexkey...
```

### ⚠️ Backup — CRITICAL

**If this key is lost, ALL stored router passwords become permanently unreadable.**
You will be locked out of managing routers via the billing system and will need to
manually re-add every router with its password.

**Backup procedure:**
1. Store the key in a password manager (e.g., Bitwarden, 1Password, KeePass)
2. Print a physical copy and store it in a secure location
3. If using cloud hosting, store it in a managed secrets service (AWS Secrets Manager,
   GCP Secret Manager, Azure Key Vault)
4. Never commit this key to Git or store it in the codebase

### Key Rotation

If you need to rotate the encryption key:

1. **Export current router passwords** (decrypt with old key):
   ```bash
   # Run this BEFORE changing the key
   node -e "
   require('dotenv').config();
   const { NetworkDevice } = require('./src/models');
   (async () => {
     const devices = await NetworkDevice.findAll();
     for (const d of devices) {
       console.log(d.name, ':', d.getDecryptedPassword());
     }
     process.exit(0);
   })();
   "
   ```

2. **Update `ROUTER_ENCRYPTION_KEY`** in `.env` to the new key

3. **Re-encrypt all passwords** with the new key:
   ```bash
   node -e "
   require('dotenv').config();
   const { NetworkDevice } = require('./src/models');
   (async () => {
     const devices = await NetworkDevice.findAll();
     for (const d of devices) {
       // Passwords were decrypted with old key in step 1
       // Now manually set _plaintextPassword with the exported value
       d._plaintextPassword = 'PASTE_EACH_PASSWORD_HERE';
       await d.save();
     }
     process.exit(0);
   })();
   "
   ```

4. **Back up the new key** using the same procedure above

---

## 8. Security Recommendations

1. **Restrict API access by IP** — Only allow your billing server's IP to connect to
   the RouterOS API (see Section 1).

2. **Use API-SSL in production** — Plain API sends credentials in cleartext over the
   network. Use port 8729 with a certificate.

3. **Dedicated API user** — Never use `admin`. The `billing-api` group has only the
   permissions needed (see Section 2).

4. **Firewall the API port** — Even with IP restrictions on the service, add a firewall
   rule as defense-in-depth:
   ```routeros
   /ip firewall filter add chain=input \
       dst-port=8728,8729 \
       src-address=!10.0.0.100/32 \
       protocol=tcp \
       action=drop \
       comment="Block API access from unauthorized IPs"
   ```

5. **Monitor the audit log** — All router commands are logged in `router_command_log`.
   Review via `GET /api/admin/network-devices/logs` regularly.

6. **Strong passwords** — Use a randomly generated password (16+ characters) for the
   API user. It's encrypted at rest so length doesn't matter for usability.
