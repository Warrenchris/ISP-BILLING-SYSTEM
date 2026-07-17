# Backup and Disaster Recovery Plan

This document outlines the backup and recovery procedures for critical secrets and database data in the ISP Billing & Management System.

---

## 1. ROUTER_ENCRYPTION_KEY

### 1.1 Purpose
The `ROUTER_ENCRYPTION_KEY` is a 32-byte hex string (64 characters) used by the application to encrypt and decrypt sensitive router passwords stored in the database (`network_devices` table). 

### 1.2 Risk of Loss
If the `ROUTER_ENCRYPTION_KEY` is lost, changed, or corrupted:
*   **Irreversible Lockout**: All existing router passwords stored in the database will be permanently undecryptable.
*   **System Outage**: The backend will be unable to log in to MikroTik API endpoints or provision/suspend PPPoE, Address-List, or Hotspot users, causing a complete provisioning outage.
*   **Manual Remediation**: If the key is lost, every router configuration in the database must be manually edited or deleted and re-registered with plaintext passwords.

### 1.3 Backup Procedure
1.  **Do not rely on the local `.env` file** as the sole source of truth. If the server's disk fails, the environment configuration is lost alongside the database.
2.  Store a copy of the `ROUTER_ENCRYPTION_KEY` in a secure, shared password manager or enterprise vault (e.g., 1Password, Bitwarden, AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault).
3.  Restrict read access to this key to lead administrators and developers only.
4.  When rotating the key, a data migration script must be executed to decrypt the old credentials using the old key and re-encrypt them using the new key before updating the server environment variables.

---

## 2. MySQL Database Backups

### 2.1 Backup Strategy
Automated daily database backups must be performed to protect against data corruption, system intrusion, or hardware failures.

### 2.2 Backup Command
A database dump can be generated using `mysqldump`:
```bash
# Export the database schema and data
mysqldump -u [username] -p[password] --single-transaction --routines --triggers isp_billing_db > /path/to/backups/db-backup-$(date +%F).sql
```
*   `--single-transaction`: Ensures a consistent backup snapshot without locking tables (crucial for live production billing systems).
*   `--routines --triggers`: Includes stored procedures and triggers.

### 2.3 Automation & Rotation (Cron Job)
Configure a daily cron job to run the backup and clean up older backups.
Example shell script (`backup.sh`):
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/isp-billing"
DB_USER="ispuser"
DB_PASS="secure_db_password"
DB_NAME="isp_billing_db"
DATE=$(date +%F)

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Perform backup
mysqldump -u "$DB_USER" -p"$DB_PASS" --single-transaction --routines --triggers "$DB_NAME" > "$BACKUP_DIR/db-backup-$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/db-backup-$DATE.sql"

# Delete backups older than 14 days (Retention Policy)
find "$BACKUP_DIR" -name "db-backup-*.sql.gz" -mtime +14 -delete
```

Add the script to your server's crontab to run daily at midnight:
```text
0 0 * * * /bin/bash /opt/isp-billing/scripts/backup.sh >> /var/log/isp-backup.log 2>&1
```

### 2.4 Restoration Procedure
To restore the database from a backup file:
```bash
# 1. Extract the compressed file
gunzip /var/backups/isp-billing/db-backup-YYYY-MM-DD.sql.gz

# 2. Re-import the SQL file into MySQL
mysql -u [username] -p[password] isp_billing_db < /var/backups/isp-billing/db-backup-YYYY-MM-DD.sql
```

---

## 3. M-Pesa Callback Token Security Note

### 3.1 Log Exposure Risk
The `MPESA_CALLBACK_TOKEN` is passed as a URL path parameter to the webhook endpoint (e.g. `/api/payments/mpesa/callback/:token`). 

> [!WARNING]
> Because standard HTTP servers, reverse proxies (like Nginx), and application loggers (like Morgan) log the full request URL path, this token **will be stored in plaintext log files** on the server.

### 3.2 Mitigation Guidelines
1.  **Restrict Log Access**: Secure log directories (`/var/log/nginx/` and application `/logs/` folder) with restricted filesystem permissions.
2.  **Token Rotation**: Treat `MPESA_CALLBACK_TOKEN` as a rotatable credential. If a log leak or unauthorized access is suspected, change the token in `.env` and register the new webhook URL with Safaricom.
3.  **Log Scrubbing**: If using a centralized logging system (e.g., Elasticsearch, Datadog), configure pattern matchers to scrub or mask the callback token from URL strings.

---

## 4. FreeRADIUS Database Credentials & Host Scope

### 4.1 Host-Scope Requirement
The MySQL database user account used by the FreeRADIUS container (default: `radius_user`) **must be scoped to a wildcard host (`'radius_user'@'%'`)** rather than a specific IP address or `localhost`.

### 4.2 Rationale
Because the FreeRADIUS service runs inside an isolated Docker bridge network container, its source IP address is dynamically assigned on startup (e.g., `172.19.0.5`, `172.19.0.6`) and is not stable across restarts. If MySQL restricts the user to `'radius_user'@'localhost'`, FreeRADIUS connections will fail with `Access denied` errors immediately upon bridge IP reassignment.

### 4.3 Database User Creation / Password Sync
If recreating the database user or synchronizing passwords manually:
```sql
-- 1. Create user with wildcard host scope and strong password
CREATE USER IF NOT EXISTS 'radius_user'@'%' IDENTIFIED BY '<exact RADIUS_DB_PASSWORD value>';

-- 2. Grant table-specific permissions only
GRANT SELECT, INSERT, UPDATE, DELETE ON isp_billing_db.radcheck TO 'radius_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON isp_billing_db.radreply TO 'radius_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON isp_billing_db.radusergroup TO 'radius_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON isp_billing_db.radacct TO 'radius_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON isp_billing_db.nas TO 'radius_user'@'%';

-- 3. Flush privileges to apply
FLUSH PRIVILEGES;
```


