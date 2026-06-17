"""
import_training_data_v2.py - Simplified Training Data Importer
"""

import argparse
import json
import sys
import os
import mysql.connector
from datetime import datetime

def get_db():
    """Create MySQL connection."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "isp_billing_db"),
        charset="utf8mb4",
        autocommit=True
    )


def main():
    parser = argparse.ArgumentParser(description='Import synthetic training data')
    parser.add_argument('--file', required=True, help='training_data.json file')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be imported')
    
    args = parser.parse_args()
    
    # Load JSON
    try:
        with open(args.file, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ File not found: {args.file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        sys.exit(1)
    
    print("\n🚀 Training Data Import")
    print("=" * 70)
    print(f"📁 File: {args.file}")
    print(f"📋 Mode: {'DRY RUN' if args.dry_run else 'ACTUAL IMPORT'}")
    print(f"\nData Summary:")
    for k, v in data.get('summary', {}).items():
        print(f"  {k}: {v}")
    print("=" * 70)
    
    if args.dry_run:
        print(f"\n✅ DRY RUN - Would import:")
        print(f"   • {len(data.get('payments', []))} payment records")
        print(f"   • {len(data.get('revenue', []))} months revenue history")
        print(f"   • {len(data.get('customers', []))} customer records")
        print(f"\nTo actually import, run:")
        print(f"   python import_training_data_v2.py --file {args.file}")
        return
    
    # Actual import
    try:
        conn = get_db()
        print("\n✓ Database connected")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)
    
    cursor = conn.cursor()
    total = 0
    
    # Import payments
    try:
        print("\n📊 Importing payments...")
        for i, payment in enumerate(data.get('payments', [])):
            sql = """
                INSERT INTO payments 
                (id, user_id, amount, payment_method, status, created_at, completed_at, mpesa_receipt_number)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE updated_at = NOW()
            """
            cursor.execute(sql, (
                payment['id'],
                payment['user_id'],
                float(payment['amount']),
                payment['payment_method'],
                payment['status'],
                payment['created_at'],
                payment.get('completed_at'),
                payment.get('mpesa_receipt_number')
            ))
            if (i + 1) % 100 == 0:
                print(f"   ✓ {i + 1} payment records imported")
        
        conn.commit()
        total += len(data.get('payments', []))
        print(f"   ✓ {len(data.get('payments', []))} payments imported")
    except Exception as e:
        print(f"   ⚠ Payment import partial: {e}")
        conn.rollback()
    
    # Import revenue history
    try:
        print("\n📈 Importing revenue history...")
        for revenue in data.get('revenue', []):
            sql = """
                INSERT INTO ai_insights 
                (prediction_type, insight_data, period_start, period_end, created_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE updated_at = NOW()
            """
            insight_json = json.dumps({
                'actual_revenue': float(revenue['revenue']),
                'active_subscribers': revenue['active_subscribers'],
                'avg_data_usage_mb': revenue['avg_data_usage_mb'],
                'payment_delays': revenue['payment_delays'],
                'plan_distribution': revenue['plan_distribution'],
            })
            cursor.execute(sql, (
                'revenue_history',
                insight_json,
                f"{revenue['period']}-01",
                f"{revenue['period']}-28"
            ))
        conn.commit()
        total += len(data.get('revenue', []))
        print(f"   ✓ {len(data.get('revenue', []))} revenue months imported")
    except Exception as e:
        print(f"   ⚠ Revenue import partial: {e}")
        conn.rollback()
    
    # Import customers
    try:
        print("\n👥 Importing customers...")
        for customer in data.get('customers', []):
            sql = """
                INSERT INTO users 
                (id, first_name, last_name, email, phone_number, role, is_active, created_at)
                VALUES (%s, %s, %s, %s, %s, 'customer', 1, NOW())
                ON DUPLICATE KEY UPDATE updated_at = NOW()
            """
            cursor.execute(sql, (
                customer['id'],
                customer['first_name'],
                customer['last_name'],
                customer['email'],
                f"+254{str(hash(customer['id']))[-9:]}"  # Generate fake phone
            ))
        conn.commit()
        total += len(data.get('customers', []))
        print(f"   ✓ {len(data.get('customers', []))} customers imported")
    except Exception as e:
        print(f"   ⚠ Customer import partial: {e}")
        conn.rollback()
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 70)
    print(f"✅ IMPORT COMPLETE - {total} records imported")
    print("=" * 70)
    print("\nNext steps:")
    print("1. Open AI Dashboard: http://localhost:3001/ai-dashboard")
    print("2. Click 'Retrain Models' button")
    print("3. Wait 10-20 seconds")
    print("4. Refresh dashboard to see predictions\n")


if __name__ == '__main__':
    main()
