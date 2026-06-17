"""
import_training_data.py
Import generated synthetic data into the ISP Billing System database.

Usage:
    python import_training_data.py --file training_data.json
"""

import argparse
import json
import sys
import os
import mysql.connector
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection function
def get_db_connection():
    """Create MySQL connection from environment variables."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "isp_billing_db"),
        charset="utf8mb4"
    )

def _execute(sql, params=(), conn=None):
    """Execute INSERT/UPDATE/DELETE query."""
    if conn is None:
        conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        last_id = cursor.lastrowid
        cursor.close()
        return last_id
    except mysql.connector.Error as e:
        conn.rollback()
        raise e
    finally:
        if conn:
            conn.close()

def _query(sql, params=(), conn=None):
    """Execute SELECT query."""
    if conn is None:
        conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        if conn:
            conn.close()


def import_payments(payments_data, dry_run=False):
    """Import payment records into payments table."""
    print(f"\n📊 Importing {len(payments_data)} payment records...")
    
    imported = 0
    conn = None if dry_run else get_db_connection()
    
    try:
        for payment in payments_data:
            sql = """
                INSERT INTO payments 
                (id, user_id, amount, payment_method, status, created_at, completed_at, mpesa_receipt_number)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE updated_at = NOW()
            """
            
            params = (
                payment['id'],
                payment['user_id'],
                payment['amount'],
                payment['payment_method'],
                payment['status'],
                payment['created_at'],
                payment['completed_at'],
                payment['mpesa_receipt_number'],
            )
            
            if not dry_run:
                try:
                    cursor = conn.cursor()
                    cursor.execute(sql, params)
                    conn.commit()
                    cursor.close()
                    imported += 1
                except Exception as e:
                    print(f"   ⚠ Skipped payment {payment['id']}: {str(e)}")
            else:
                imported += 1
        
        print(f"   ✓ Would import {imported} payments")
        return imported
    finally:
        if conn:
            conn.close()


def import_revenue_history(revenue_data, dry_run=False):
    """Import revenue history as AI insights for reference."""
    print(f"\n📈 Importing {len(revenue_data)} months of revenue history...")
    
    imported = 0
    conn = None if dry_run else get_db_connection()
    
    try:
        for revenue in revenue_data:
            sql = """
                INSERT INTO ai_insights 
                (prediction_type, insight_data, period_start, period_end, created_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE updated_at = NOW()
            """
            
            insight_json = json.dumps({
                'actual_revenue': revenue['revenue'],
                'active_subscribers': revenue['active_subscribers'],
                'avg_data_usage_mb': revenue['avg_data_usage_mb'],
                'payment_delays': revenue['payment_delays'],
                'plan_distribution': revenue['plan_distribution'],
            })
            
            period_start = f"{revenue['period']}-01"
            period_end = f"{revenue['period']}-28"
            
            if not dry_run:
                try:
                    cursor = conn.cursor()
                    cursor.execute(sql, (
                        'revenue_history',
                        insight_json,
                        period_start,
                        period_end,
                    ))
                    conn.commit()
                    cursor.close()
                    imported += 1
                except Exception as e:
                    print(f"   ⚠ Skipped revenue {revenue['period']}: {str(e)}")
            else:
                imported += 1
        
        print(f"   ✓ Would import {imported} months of revenue history")
        return imported
    finally:
        if conn:
            conn.close()


def import_customers(customers_data, dry_run=False):
    """Import customer records into users table."""
    print(f"\n👥 Importing {len(customers_data)} customer records...")
    
    imported = 0
    for customer in customers_data:
        sql = """
            INSERT INTO users 
            (id, first_name, last_name, email, phone_number, role, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, 'customer', 1, NOW())
            ON DUPLICATE KEY UPDATE updated_at = NOW()
        """
        
        if not dry_run:
            try:
                _execute(sql, (
                    customer['id'],
                    customer['first_name'],
                    customer['last_name'],
                    customer['email'],
                    f"+254{random.randint(7, 9)}{random.randint(10000000, 99999999)}",
                ))
                imported += 1
            except Exception as e:
                print(f"   ⚠ Skipped customer {customer['id']}: {str(e)}")
        else:
            imported += 1
    
    print(f"   ✓ Imported {imported} customer records")
    return imported


def import_churn_insights(customers_data, dry_run=False):
    """Import churn scores as AI insights."""
    print(f"\n⚠ Importing {len(customers_data)} churn risk scores...")
    
    imported = 0
    for customer in customers_data:
        if customer['churn_score'] > 0.3:  # Only flag significant scores
            sql = """
                INSERT INTO ai_insights 
                (prediction_type, user_id, score, insight_data, is_flagged, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE updated_at = NOW()
            """
            
            insight_json = json.dumps({
                'payment_delay_count': customer['payment_delay_count'],
                'ticket_count': customer['ticket_count'],
                'usage_trend': customer['usage_trend'],
                'subscription_age_days': customer['subscription_age_days'],
                'risk_level': 'HIGH' if customer['churn_score'] >= 0.7 else 'MEDIUM',
                'reasons': [
                    f"Payment delays: {customer['payment_delay_count']}",
                    f"Support tickets: {customer['ticket_count']}",
                    f"Usage trend: {customer['usage_trend']}",
                ]
            })
            
            if not dry_run:
                try:
                    _execute(sql, (
                        'churn_risk',
                        customer['id'],
                        customer['churn_score'],
                        insight_json,
                        1 if customer['churn_score'] >= 0.7 else 0,
                    ))
                    imported += 1
                except Exception as e:
                    print(f"   ⚠ Skipped churn insight {customer['id']}: {str(e)}")
            else:
                imported += 1
    
    print(f"   ✓ Imported {imported} churn risk insights")
    return imported


def main():
    parser = argparse.ArgumentParser(description='Import synthetic training data into ISP Billing database')
    parser.add_argument('--file', required=True, help='Path to training_data.json file')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be imported without actually importing')
    parser.add_argument('--skip-customers', action='store_true', help='Skip customer import (if already exist)')
    parser.add_argument('--skip-payments', action='store_true', help='Skip payment import')
    parser.add_argument('--skip-revenue', action='store_true', help='Skip revenue history import')
    parser.add_argument('--skip-churn', action='store_true', help='Skip churn insight import')
    
    args = parser.parse_args()
    
    # Load JSON file
    try:
        with open(args.file, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ File not found: {args.file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        sys.exit(1)
    
    print("\n🚀 Importing Synthetic Training Data into ISP Billing Database")
    print("=" * 70)
    print(f"📁 File: {args.file}")
    print(f"📋 Mode: {'DRY RUN' if args.dry_run else 'REAL IMPORT'}")
    print(f"Generated: {data.get('generated_at', 'Unknown')}")
    print("\nData Summary:")
    for key, value in data.get('summary', {}).items():
        print(f"   {key}: {value}")
    print("=" * 70)
    
    total_imported = 0
    
    try:
        if not args.skip_customers:
            total_imported += import_customers(data.get('customers', []), dry_run=args.dry_run)
        
        if not args.skip_payments:
            total_imported += import_payments(data.get('payments', []), dry_run=args.dry_run)
        
        if not args.skip_revenue:
            total_imported += import_revenue_history(data.get('revenue', []), dry_run=args.dry_run)
        
        if not args.skip_churn:
            total_imported += import_churn_insights(data.get('customers', []), dry_run=args.dry_run)
        
        print("\n" + "=" * 70)
        if args.dry_run:
            print(f"✅ DRY RUN COMPLETE - Would have imported {total_imported} records")
            print("\nTo actually import, run without --dry-run:")
            print(f"   python import_training_data.py --file {args.file}")
        else:
            print(f"✅ IMPORT COMPLETE - {total_imported} records imported successfully")
        print("=" * 70)
    
    except Exception as e:
        print(f"\n❌ Import failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
