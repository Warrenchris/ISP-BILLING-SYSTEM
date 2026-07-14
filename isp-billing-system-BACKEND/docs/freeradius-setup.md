# FreeRADIUS & Dynamic NAS Setup Guide — ISP Billing System Phase 2

This document details the configuration, deployment, and security tuning for the FreeRADIUS AAA (Authentication, Authorization, Accounting) server container introduced in Phase 2.

---

## 1. FreeRADIUS Architecture

The system uses standard FreeRADIUS with the SQL module (`rlm_sql`) pointing directly to our existing MySQL database.

```
       +------------------------------------+
       |          MikroTik Router           |
       |  (PPPoE Server / Hotspot Gateway)  |
       +------------------------------------+
              |                     ^
         Auth | (1812/udp)     Acct | (1813/udp)
              v                     |
       +------------------------------------+
       |        FreeRADIUS Container        |
       +------------------------------------+
                        |
            SQL Query   | (Port 3306)
                        v
       +------------------------------------+
       |          MySQL Database            |
       |     (isp_billing_db on host)       |
       +------------------------------------+
```

The tables are populated as follows:
- **`radcheck`**: Authenticates users (credentials, password validation).
- **`radreply`**: Returns authorization parameters (rate limits, session timeout).
- **`radusergroup`**: Maps user identifiers to data plan groups.
- **`radacct`**: Captures real-time session traffic data (accounting).
- **`nas`**: Lists authorized RADIUS clients (routers) dynamically.

---

## 2. Security Mitigation: Scoped Database User (Flag #4)

RADIUS storage uses plaintext passwords in the `radcheck` table. To protect the rest of your billing, invoice, and user data in the event of a FreeRADIUS container compromise, you **MUST** configure a dedicated MySQL database user with access restricted strictly to the RADIUS tables.

### MySQL Permissions Setup
Run the following SQL commands on your primary MySQL instance to provision the restricted user:

```sql
-- Create the dedicated user for FreeRADIUS container
CREATE USER 'radius_user'@'%' IDENTIFIED BY 'RADIUS_DB_PASSWORD_HERE';

-- Grant permissions ONLY to RADIUS standard tables
GRANT SELECT, INSERT, UPDATE, DELETE ON isp_billing_db.radcheck TO 'radius_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON isp_billing_db.radreply TO 'radius_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON isp_billing_db.radusergroup TO 'radius_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON isp_billing_db.radacct TO 'radius_user'@'%';
GRANT SELECT ON isp_billing_db.nas TO 'radius_user'@'%';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;
```

Modify the environment variables for the `freeradius` service in your `.env` to connect using this restricted credential:
```ini
DB_USER=radius_user
DB_PASSWORD=RADIUS_DB_PASSWORD_HERE
```

---

## 3. Dynamic NAS Clients via MySQL (Flag #1)

Instead of a single global client secret configured in a static `clients.conf` file, we read RADIUS client definition records (routers) dynamically from the database `nas` table. This allows setting unique `radiusSharedSecret` credentials per-router.

### FreeRADIUS Configuration
The SQL module config is set up in `mods-enabled/sql` with:
```
read_clients = yes
client_table = "nas"
```

### Backend Automated Synchronization
Whenever you create, update, or deactivate a router using the `NetworkDevice` admin endpoints, the backend:
1. Decrypts the `radiusSharedSecret` stored securely at rest (AES-256-GCM).
2. Automatically upserts or deletes the client record in the `nas` table.

This ensures that adding a new router immediately registers it as a RADIUS client without requiring a FreeRADIUS service reboot.

---

## 4. Secret Strength Enforcement (Flag #2)

To prevent security misconfigurations in production environments, the FreeRADIUS entrypoint script (`docker/freeradius/entrypoint.sh`) enforces structural checks. The container will **refuse to boot** if:
- `RADIUS_SHARED_SECRET` is unset.
- `RADIUS_SHARED_SECRET` is equal to the fallback placeholder `testing123`.
- `RADIUS_SHARED_SECRET` is shorter than 12 characters.

Ensure a strong 32-character hex key is generated and configured in your `.env`:
```ini
RADIUS_SHARED_SECRET=35c6e8668748386de27bbba54ad23fbc
```

---

## 5. Data Cap Enforcement Lag & Interim Intervals (Flag #3)

For data-capped subscriptions, there is a physical monitoring latency to consider. 

### Why is there a lag?
1. The router sends bandwidth accounting packets to FreeRADIUS periodically based on the `Acct-Interim-Interval` attribute.
2. The Node.js backend running `accountingWatcher` sweeps the `radacct` table at defined intervals.

### Mitigation: Tighter Intervals
- **Unlimited Plans**: Configured with `Acct-Interim-Interval = 300` (5 minutes) to save router resources.
- **Capped/Voucher Plans**: Automatically synced with **`Acct-Interim-Interval = 60` (1 minute)**.
- The `accountingWatcher` cron task runs every 5 minutes (`ACCOUNTING_CHECK_CRON=*/5 * * * *`).

### Worst Case Lag Calculation
```
Interim Update Interval (60s) + Watcher Sweep (300s) = 360 seconds (6 minutes)
```

In the worst case, a user can continue downloading for **6 minutes** after breaching their data limit before a cutoff command is sent.
- On a 10 Mbps connection, a user can download at most ~450 MB extra during this window.
- On a 20 Mbps connection, at most ~900 MB.
This lag is an acceptable production tolerance for standard fiber packages. Tightening the cron task to run more frequently (e.g., every 2 minutes) reduces this window further but increases MySQL query loads.

---

## 6. Configuring MikroTik as a RADIUS Client

Execute the following commands on your MikroTik Router (v7) to route AAA traffic through FreeRADIUS:

### Step 1: Add RADIUS Server
```routeros
/radius add service=ppp,hotspot \
    address=YOUR_FREERADIUS_SERVER_IP \
    secret=THE_PER_ROUTER_RADIUS_SECRET \
    authentication-port=1812 \
    accounting-port=1813 \
    timeout=3s \
    comment="RADIUS Server for Billing Integration"
```

### Step 2: Configure PPPoE to use RADIUS
```routeros
/ppp aaa set use-radius=yes accounting=yes interim-update=1m
```

### Step 3: Configure Hotspot Profile to use RADIUS
```routeros
/ip hotspot profile set [find default=yes] use-radius=yes
/ip hotspot profile set [find default=yes] nas-port-type=19
```

---

## 7. Testing RADIUS Authentication

You can test database authentication mappings using `radtest` directly from the FreeRADIUS container:

```bash
# Exec into container and verify authentication mapping
docker exec -it isp-freeradius radtest <radius_username> <radius_password> localhost 0 <RADIUS_SHARED_SECRET>
```

A successful response outputs `Access-Accept` with mapped attributes (e.g. `Mikrotik-Rate-Limit`).
An invalid password/username outputs `Access-Reject`.
