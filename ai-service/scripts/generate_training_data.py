"""
generate_training_data.py
Synthetic data generator for AI model training.
Creates 12 months of revenue, churn, payment, and usage data for Kenyan ISP.

Usage:
    python generate_training_data.py --output sql   # Generate SQL INSERTs
    python generate_training_data.py --output json  # Generate JSON
    python generate_training_data.py --inject       # Inject directly into DB
"""

import argparse
import json
import random
import math
from datetime import datetime, timedelta
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Configuration for Kenyan ISP
# ─────────────────────────────────────────────────────────────────────────────

PLAN_PRICES = {
    'basic': 500,      # KES
    'standard': 1500,
    'premium': 3000,
}

PLAN_DATA_LIMITS = {
    'basic': 10,       # GB/month
    'standard': 50,
    'premium': 200,
}

# Distribution of customers across plans
PLAN_DISTRIBUTION = {
    'basic': 0.50,      # 50% on basic
    'standard': 0.35,   # 35% on standard
    'premium': 0.15,    # 15% on premium
}

# Churn risk parameters
HIGH_CHURN_INDICATORS = {
    'payment_delays_high': 3,        # >3 late payments
    'support_tickets_high': 4,       # >4 tickets
    'data_usage_decline': -0.4,      # Usage trend < -0.4
    'new_customer': 30,              # Subscription < 30 days
}

# ─────────────────────────────────────────────────────────────────────────────
# Data Generators
# ─────────────────────────────────────────────────────────────────────────────

def generate_customer_id(index):
    """Generate UUID-like customer ID."""
    import uuid
    random.seed(index)
    return str(uuid.UUID(int=random.getrandbits(128)))


def generate_12_month_revenue():
    """Generate 12 months of realistic revenue data for Kenyan ISP."""
    months = []
    base_date = datetime.now() - timedelta(days=365)
    
    # Start with 4 customers, grow to 4 over the year
    subscriber_start = 4
    subscriber_end = 4
    
    for month_idx in range(12):
        period = (base_date + timedelta(days=30 * month_idx)).strftime("%Y-%m")
        
        # Subscriber count remains stable
        active_subs = subscriber_start + int((subscriber_end - subscriber_start) * (month_idx / 12))
        
        # Revenue calculation: sum of plan prices * distribution
        monthly_revenue = (
            active_subs * PLAN_PRICES['basic'] * PLAN_DISTRIBUTION['basic'] +
            active_subs * PLAN_PRICES['standard'] * PLAN_DISTRIBUTION['standard'] +
            active_subs * PLAN_PRICES['premium'] * PLAN_DISTRIBUTION['premium']
        )
        
        # Add some realistic variance (±20%)
        variance = random.uniform(0.8, 1.2)
        monthly_revenue = int(monthly_revenue * variance)
        
        # Average data usage across subscribers
        avg_usage_mb = random.randint(500, 2000)
        
        # Payment delays (usually 0-1 per month)
        payment_delays = random.randint(0, 2)
        
        # Plan distribution
        plan_dist = {
            'basic': max(1, int(active_subs * PLAN_DISTRIBUTION['basic'])),
            'standard': max(1, int(active_subs * PLAN_DISTRIBUTION['standard'])),
            'premium': max(0, active_subs - int(active_subs * (PLAN_DISTRIBUTION['basic'] + PLAN_DISTRIBUTION['standard']))),
        }
        
        months.append({
            'period': period,
            'active_subscribers': active_subs,
            'revenue': float(monthly_revenue),
            'avg_data_usage_mb': avg_usage_mb,
            'payment_delays': payment_delays,
            'plan_distribution': plan_dist,
        })
    
    return months


def generate_customer_records(count=50):
    """Generate customer records with churn features."""
    customers = []
    base_date = datetime.now() - timedelta(days=365)
    
    for i in range(count):
        customer_id = generate_customer_id(i)
        
        # Realistic Kenyan names
        first_names = ['James', 'Mary', 'Joseph', 'Grace', 'Peter', 'Alice', 'David', 'Rose', 'Samuel', 'Jane',
                      'Michael', 'Patricia', 'John', 'Catherine', 'Paul', 'Diana', 'George', 'Elizabeth']
        last_names = ['Mwangi', 'Kipchoge', 'Ochieng', 'Wanjiru', 'Kariuki', 'Njoroge', 'Kimani', 'Musyoka',
                     'Okoro', 'Adeyemi', 'Hassan', 'Ahmed', 'Abdi', 'Mussa']
        
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        email = f"{first_name.lower()}.{last_name.lower()}@example.com"
        
        # Subscription age in days
        subscription_age = random.randint(30, 365)
        
        # Payment delays (0-5)
        payment_delay_count = random.randint(0, 5)
        
        # Support tickets (0-8)
        ticket_count = random.randint(0, 8)
        
        # Data usage trend (-1.0 to +1.0)
        usage_trend = random.uniform(-1.0, 1.0)
        
        # Calculate churn likelihood
        churn_score = 0.0
        if payment_delay_count > HIGH_CHURN_INDICATORS['payment_delays_high']:
            churn_score += 0.3
        if ticket_count > HIGH_CHURN_INDICATORS['support_tickets_high']:
            churn_score += 0.2
        if usage_trend < HIGH_CHURN_INDICATORS['data_usage_decline']:
            churn_score += 0.25
        if subscription_age < HIGH_CHURN_INDICATORS['new_customer']:
            churn_score += 0.15
        
        churn_score = min(churn_score, 1.0)
        
        # 15% chance of being churned if high score
        churned = 1 if churn_score > 0.6 and random.random() < 0.15 else 0
        
        customers.append({
            'id': customer_id,
            'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'payment_delay_count': payment_delay_count,
            'ticket_count': ticket_count,
            'usage_trend': round(usage_trend, 2),
            'subscription_age_days': subscription_age,
            'churned': churned,
            'churn_score': round(churn_score, 2),
        })
    
    return customers


def generate_payment_records(customer_count=50, months_back=6):
    """Generate 6 months of payment records."""
    payments = []
    base_date = datetime.now() - timedelta(days=30 * months_back)
    
    # Each customer makes 2-3 payments per month on average
    payments_per_customer_per_month = random.uniform(2, 3)
    
    for month_offset in range(months_back):
        month_start = base_date + timedelta(days=30 * month_offset)
        
        # How many payments in this month?
        total_payments_this_month = int(customer_count * payments_per_customer_per_month)
        
        for _ in range(total_payments_this_month):
            customer_idx = random.randint(0, customer_count - 1)
            customer_id = generate_customer_id(customer_idx)
            
            # Payment amount based on plan
            plan = random.choices(
                list(PLAN_PRICES.keys()),
                weights=[PLAN_DISTRIBUTION['basic'], PLAN_DISTRIBUTION['standard'], PLAN_DISTRIBUTION['premium']]
            )[0]
            amount = PLAN_PRICES[plan] + random.randint(-100, 200)  # Allow some variance
            
            # Random date within month
            days_offset = random.randint(0, 29)
            payment_date = month_start + timedelta(days=days_offset)
            
            # 95% success rate
            status = 'completed' if random.random() < 0.95 else 'failed'
            
            payments.append({
                'id': f"pay_{customer_idx}_{month_offset}_{random.randint(1000, 9999)}",
                'user_id': customer_id,
                'amount': float(amount),
                'payment_method': random.choice(['mpesa', 'bank_transfer', 'cash']),
                'status': status,
                'created_at': payment_date.isoformat(),
                'completed_at': payment_date.isoformat() if status == 'completed' else None,
                'mpesa_receipt_number': f"SAH{random.randint(100000, 999999)}" if random.random() < 0.7 else None,
            })
    
    return payments


def generate_usage_profiles(customer_count=50):
    """Generate usage profiles for 12-month anomaly detection."""
    profiles = []
    
    for i in range(customer_count):
        customer_id = generate_customer_id(i)
        
        # Generate 12-month usage history with seasonal variance
        usage_history = []
        base_usage = random.randint(100, 2000)
        
        for month in range(12):
            # Add seasonal component (higher in certain months)
            seasonal = 1.0 + 0.3 * math.sin((month / 12.0) * 2 * math.pi)
            variance = random.uniform(0.8, 1.2)
            usage = int(base_usage * seasonal * variance)
            usage_history.append(usage)
        
        # Current month usage (with potential spike for some customers)
        current_usage = usage_history[-1]
        if random.random() < 0.1:  # 10% spike for anomaly detection
            current_usage = int(current_usage * random.uniform(2.0, 4.0))
        
        profiles.append({
            'user_id': customer_id,
            'user_name': f"Customer_{i}",
            'usage_history': usage_history,
            'current_usage': current_usage,
        })
    
    return profiles


# ─────────────────────────────────────────────────────────────────────────────
# Output Generators
# ─────────────────────────────────────────────────────────────────────────────

def output_as_json(data_dict, output_file=None):
    """Output as JSON."""
    output = json.dumps(data_dict, indent=2, default=str)
    
    if output_file:
        with open(output_file, 'w') as f:
            f.write(output)
        print(f"✓ JSON data written to {output_file}")
    else:
        print(output)
    
    return output


def output_as_sql(data_dict, output_file=None):
    """Generate SQL INSERT statements."""
    sql_lines = [
        "-- Generated Training Data for ISP Billing AI",
        f"-- Generated: {datetime.now().isoformat()}",
        "",
    ]
    
    # Payments table
    sql_lines.append("-- =====================================================")
    sql_lines.append("-- PAYMENTS (6 months of transaction history)")
    sql_lines.append("-- =====================================================")
    for payment in data_dict.get('payments', [])[:100]:  # Limit to 100 for readability
        receipt_val = f"'{payment['mpesa_receipt_number']}'" if payment['mpesa_receipt_number'] else 'NULL'
        sql_lines.append(
            f"INSERT INTO payments (id, user_id, amount, payment_method, status, completed_at, "
            f"mpesa_receipt_number, created_at) VALUES ("
            f"'{payment['id']}', '{payment['user_id']}', {payment['amount']}, "
            f"'{payment['payment_method']}', '{payment['status']}', "
            f"'{payment['completed_at']}', {receipt_val}, "
            f"'{payment['created_at']}');"
        )
    
    sql_lines.append("")
    sql_lines.append("-- =====================================================")
    sql_lines.append("-- REVENUE HISTORY (12 months monthly aggregates)")
    sql_lines.append("-- =====================================================")
    for revenue in data_dict.get('revenue', []):
        plan_json = json.dumps(revenue['plan_distribution']).replace("'", "\\'")
        sql_lines.append(
            f"INSERT INTO ai_insights (prediction_type, predicted_value, insight_data, "
            f"period_start, created_at) VALUES ("
            f"'revenue_forecast', {revenue['revenue']}, "
            f"'{json.dumps(revenue, default=str).replace(chr(39), chr(96))}', "
            f"'{revenue['period']}-01', NOW());"
        )
    
    sql_lines.append("")
    sql_lines.append("-- Note: Customer records must be inserted into 'users' table separately")
    sql_lines.append("-- See generate_training_data.json for customer churn features")
    
    output = "\n".join(sql_lines)
    
    if output_file:
        with open(output_file, 'w') as f:
            f.write(output)
        print(f"✓ SQL statements written to {output_file}")
    else:
        print(output)
    
    return output


def inject_into_db(data_dict):
    """Inject data directly into MySQL database."""
    try:
        from services.data_fetcher import _execute
        
        print("⚠ Database injection not yet implemented")
        print("✓ Use JSON output and import manually for now")
        
    except ImportError:
        print("❌ Could not import database module")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Generate training data for ISP Billing AI')
    parser.add_argument('--output', choices=['json', 'sql'], default='json',
                       help='Output format (default: json)')
    parser.add_argument('--file', type=str, help='Output file path')
    parser.add_argument('--customers', type=int, default=50,
                       help='Number of customer records to generate (default: 50)')
    parser.add_argument('--inject', action='store_true',
                       help='Inject directly into database (experimental)')
    
    args = parser.parse_args()
    
    print("🚀 Generating Synthetic Training Data for Kenyan ISP")
    print("=" * 60)
    
    # Generate all data
    print("📊 Generating 12-month revenue history...")
    revenue = generate_12_month_revenue()
    
    print(f"👥 Generating {args.customers} customer records...")
    customers = generate_customer_records(args.customers)
    
    print("💰 Generating 6-month payment history...")
    payments = generate_payment_records(args.customers, months_back=6)
    
    print("📈 Generating usage profiles...")
    usage_profiles = generate_usage_profiles(args.customers)
    
    # Compile data
    data = {
        'generated_at': datetime.now().isoformat(),
        'revenue': revenue,
        'customers': customers,
        'payments': payments,
        'usage_profiles': usage_profiles,
        'summary': {
            'total_customers': len(customers),
            'total_payments': len(payments),
            'revenue_months': len(revenue),
            'usage_profiles': len(usage_profiles),
            'total_revenue_12mo': sum(r['revenue'] for r in revenue),
            'avg_monthly_revenue': sum(r['revenue'] for r in revenue) / len(revenue),
        }
    }
    
    print("\n" + "=" * 60)
    print("📋 Data Summary:")
    print(f"   Revenue months: {data['summary']['revenue_months']}")
    print(f"   Customers: {data['summary']['total_customers']}")
    print(f"   Payments: {data['summary']['total_payments']}")
    print(f"   Usage profiles: {data['summary']['usage_profiles']}")
    print(f"   Total revenue (12mo): KES {data['summary']['total_revenue_12mo']:,.0f}")
    print(f"   Avg monthly revenue: KES {data['summary']['avg_monthly_revenue']:,.0f}")
    print("=" * 60)
    
    # Output
    if args.output == 'json':
        output_file = args.file or 'training_data.json'
        output_as_json(data, output_file)
    elif args.output == 'sql':
        output_file = args.file or 'training_data.sql'
        output_as_sql(data, output_file)
    
    if args.inject:
        inject_into_db(data)
    
    print("\n✅ Data generation complete!")
    print(f"📁 Output: {args.file or f'training_data.{args.output}'}")


if __name__ == '__main__':
    main()
