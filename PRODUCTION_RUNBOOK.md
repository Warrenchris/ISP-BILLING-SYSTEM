# PRODUCTION OPERATIONAL RUNBOOK — ISP BILLING PLATFORM

**System:** ISP Billing, FreeRADIUS AAA, MikroTik Automation, M-Pesa & AI Stack  
**Target Environment:** Linux / Docker Compose / Kubernetes  
**Date:** August 20, 2026  

---

## 1. Initial Production Deployment (Zero-to-Running)

### Step 1: Clone Repository & Prepare Environment Configuration
```bash
git clone <repo_url> /opt/isp-billing-system
cd /opt/isp-billing-system

# Create production .env from template
cp .env.example .env
chmod 600 .env
```

### Step 2: Configure Production Secrets in `.env`
Ensure strong, generated secrets for:
- `DB_PASSWORD` (Min 24 chars)
- `REDIS_PASSWORD` (Min 24 chars)
- `JWT_SECRET` (Min 32 chars)
- `AI_INTERNAL_SECRET` (Min 32 chars)
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`
- `GROQ_API_KEY`
- `ROUTER_ENCRYPTION_KEY` (64-char Hex AES-256 key)
- `RADIUS_SHARED_SECRET`

### Step 3: Validate Docker Configuration & Build Containers
```bash
# Validate compose syntax
docker compose config

# Build container images
docker compose build --no-cache

# Start the cluster in detached mode
docker compose up -d
```

### Step 4: Execute Database Migrations
```bash
docker compose exec backend npm run migrate
```

### Step 5: Verify Cluster Health Status
```bash
docker compose ps
docker compose exec backend npm run healthcheck
curl -s http://127.0.0.1:3000/api/health | jq .
curl -s http://127.0.0.1:5001/api/ai/health | jq .
```

---

## 2. Standard Operational Procedures (SOP)

### 2.1 Database Backup Execution (Automated / Manual)
```bash
# Manual backup execution
docker compose exec backend node scripts/db-backup.js

# Configure automated hourly cron on host:
0 * * * * cd /opt/isp-billing-system && docker compose exec -T backend node scripts/db-backup.js >> /var/log/isp-backup.log 2>&1
```

### 2.2 Database Restore Procedure
```bash
# Restore specific snapshot
docker compose exec backend node scripts/db-restore.js backups/backup-isp_billing_db-<timestamp>.sql.gz
```

### 2.3 Secret Rotation SOP
1. Generate new `JWT_SECRET` or `AI_INTERNAL_SECRET`.
2. Update `.env`.
3. Perform rolling restart:
```bash
docker compose restart backend ai-service
```

---

## 3. Incident Response & Troubleshooting

| Symptom | Probable Cause | SRE Action |
| :--- | :--- | :--- |
| `503 Service Unavailable` on AI chat | Python Flask service restarting / Groq API limit | Inspect logs via `docker logs isp-ai-service --tail 100` |
| M-Pesa callbacks failing | Ngrok / SSL domain changed or token mismatch | Verify `MPESA_CALLBACK_URL` and `MPESA_CALLBACK_TOKEN` in `.env` |
| Queue jobs stalled | Redis memory exhaustion / Redis offline | Check `docker compose exec redis redis-cli info memory` |
| FreeRADIUS rejecting logins | User password mismatch or expired plan | Run `docker compose exec freeradius radtest <user> <pass> 127.0.0.1 0 <secret>` |
