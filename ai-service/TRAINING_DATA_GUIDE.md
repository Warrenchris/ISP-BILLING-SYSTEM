# Training Data Generation Guide

## Quick Start

Generate and import synthetic training data in 3 commands:

### 1. Generate Synthetic Data
```bash
cd ai-service/scripts
python generate_training_data.py --output json --file ../data/training_data.json
```

This creates realistic data for a Kenyan ISP:
- ✅ 12 months of monthly revenue history
- ✅ 50 customer records with churn indicators
- ✅ 6 months of payment transaction history (300+ payments)
- ✅ Usage profiles for anomaly detection

**Output:** `ai-service/data/training_data.json` (includes revenue summary)

### 2. Verify Generated Data (Optional)
```bash
# View the JSON structure
python -m json.tool ../data/training_data.json | head -100

# Check statistics
cat ../data/training_data.json | grep -A 10 '"summary"'
```

### 3. Import Into Database
```bash
python import_training_data.py --file ../data/training_data.json
```

**First time? Use dry-run first:**
```bash
python import_training_data.py --file ../data/training_data.json --dry-run
```

---

## What Gets Generated

### Revenue History (12 months)
```json
{
  "period": "2025-05",
  "active_subscribers": 4,
  "revenue": 24600.0,
  "avg_data_usage_mb": 1250,
  "payment_delays": 1,
  "plan_distribution": {
    "basic": 2,
    "standard": 1,
    "premium": 1
  }
}
```

### Customer Records (50 customers)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "first_name": "James",
  "last_name": "Mwangi",
  "email": "james.mwangi@example.com",
  "payment_delay_count": 1,
  "ticket_count": 2,
  "usage_trend": 0.32,
  "subscription_age_days": 180,
  "churned": 0,
  "churn_score": 0.28
}
```

### Payment History (300+ transactions)
```json
{
  "id": "pay_0_0_1234",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 1525.0,
  "payment_method": "mpesa",
  "status": "completed",
  "created_at": "2025-11-15T14:32:00",
  "completed_at": "2025-11-15T14:32:00",
  "mpesa_receipt_number": "SAH123456"
}
```

### Usage Profiles (50 profiles)
12-month usage history per customer for anomaly detection.

---

## Realistic Parameters (Kenyan ISP)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Basic Plan | KES 500/mo | 10 GB limit |
| Standard Plan | KES 1,500/mo | 50 GB limit |
| Premium Plan | KES 3,000/mo | 200 GB limit |
| Distribution | 50/35/15 | Basic/Standard/Premium |
| Subscribers | 4 | Starting point |
| Payment Success | 95% | 5% failures |
| High Churn Threshold | 0.70 | Risk score ≥ 0.70 = HIGH |

---

## Model Readiness After Import

### ✅ Models Ready After Import

**Revenue Forecasting (MLR):**
- ✅ 12 months of revenue history (requires ≥ 4)
- ✅ Active subscriber counts
- ✅ Payment delays
- ✅ Plan distribution
- **Status:** Ready for training

**Churn Detection:**
- ✅ 50 customer records (requires ≥ 5)
- ✅ Payment delay history
- ✅ Support ticket counts
- ✅ Data usage trends
- **Status:** Ready for training

**Anomaly Detection:**
- ✅ 6 months payment history (requires ≥ 3)
- ✅ Revenue vs predicted (artificial baseline)
- ✅ 50 usage profiles (requires ≥ 10)
- **Status:** Ready for training

### Training Next Steps

Once data is imported, trigger model training:

```bash
# Via API:
curl -X POST http://localhost:5000/api/ai/retrain

# Or via Frontend:
# Navigate to AI Dashboard > [Retrain Models] button
```

---

## Customization

### Generate Different Dataset Sizes

```bash
# 100 customers (default 50)
python generate_training_data.py --customers 100 --output json

# 200 customers, SQL output
python generate_training_data.py --customers 200 --output sql

# Custom output file
python generate_training_data.py --file custom_data.json
```

### Edit Parameters (Before Generate)

Open `generate_training_data.py` and modify:

```python
# Line 20-31: Change plan prices/limits
PLAN_PRICES = {
    'basic': 500,       # ← Modify here (KES)
    'standard': 1500,
    'premium': 3000,
}

# Line 33-36: Change customer distribution
PLAN_DISTRIBUTION = {
    'basic': 0.50,      # ← 50% on basic plan
    'standard': 0.35,   
    'premium': 0.15,    
}

# Line 38-42: Change churn thresholds
HIGH_CHURN_INDICATORS = {
    'payment_delays_high': 3,
    'support_tickets_high': 4,
    ...
}
```

### Partial Imports

```bash
# Skip customer import (already exists)
python import_training_data.py --file training_data.json --skip-customers

# Only import payments
python import_training_data.py --file training_data.json --skip-revenue --skip-churn

# Only revenue history
python import_training_data.py --file training_data.json --skip-payments --skip-customers --skip-churn
```

---

## Troubleshooting

### Error: "ModuleNotFoundError: No module named 'services'"

Make sure you're running from the `ai-service` directory:
```bash
cd ai-service/scripts
python generate_training_data.py ...
```

### Error: "No module named 'mysql.connector'"

Install the MySQL connector:
```bash
pip install mysql-connector-python
```

### Data Not Appearing in Dashboard

1. **Check import succeeded:**
   ```bash
   python import_training_data.py --file training_data.json --dry-run
   ```

2. **Retrain models:**
   - Frontend: Click "Retrain Models" button
   - Or: `curl -X POST http://localhost:5000/api/ai/retrain`

3. **Wait for model training** (can take 5-10 seconds)

4. **Refresh dashboard** (Ctrl+F5 for hard refresh)

### Models Still Showing Zero Values After Import

Models need to be retrained after data import:

```bash
# Trigger via Python
curl -X POST http://localhost:5000/api/ai/retrain

# Expected response:
{
  "success": true,
  "results": {
    "mlr": {"success": true, "coefficients": [...], "r_squared": 0.92},
    "churn": {"success": true, "accuracy": 78.5, "n": 50}
  }
}
```

---

## Data Integrity

All generated data is:
- ✅ **Realistic** - Based on actual Kenyan ISP parameters
- ✅ **Consistent** - Same customer IDs throughout tables
- ✅ **Statistically sound** - Revenue matches subscriber counts
- ✅ **Seed-based** - Same customer index = same customer ID (reproducible)
- ✅ **Temporal** - All dates within last 12 months

---

## Next Steps

1. **Generate data:** `python generate_training_data.py --output json`
2. **Import to DB:** `python import_training_data.py --file training_data.json`
3. **Retrain models:** Click "Retrain Models" in AI Dashboard
4. **View predictions:** Dashboard should now show revenue forecasts, churn risks, anomalies

---

Questions? Check the audit report for model performance expectations.
