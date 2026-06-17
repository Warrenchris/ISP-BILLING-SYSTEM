#!/usr/bin/env python3
"""
simple_importer.py - Direct database importer for training data.
Standalone script - no service dependencies.
"""

import json
import os
import sys
from datetime import datetime

try:
    import mysql.connector
    from mysql.connector import Error
except ImportError:
    print("❌ mysql.connector not found. Installing...")
    os.system("pip install mysql-connector-python")
    import mysql.connector
    from mysql.connector import Error


class TrainingDataImporter:
    def __init__(self, host="localhost", user="root", password="", database="isp_billing_db"):
        self.host = host
        self.user = user
        self.password = password
        self.database = database
        self.connection = None
        self.cursor = None
    
    def connect(self):
        """Connect to database."""
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                user=self.user,
                password=self.password,
                database=self.database
            )
            self.cursor = self.connection.cursor(dictionary=True)
            print(f"✅ Connected to {self.database}")
            return True
        except Error as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    def disconnect(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
            print("✅ Disconnected")
    
    def execute(self, sql, params=None, fetch=False):
        """Execute SQL statement."""
        try:
            if params:
                self.cursor.execute(sql, params)
            else:
                self.cursor.execute(sql)
            self.connection.commit()
            
            if fetch:
                return self.cursor.fetchall()
            return self.cursor.rowcount
        except Error as e:
            self.connection.rollback()
            return None
    
    def import_payments(self, payments_list, dry_run=False):
        """Import payment records."""
        if not payments_list:
            print("⚠️  No payments to import")
            return 0
        
        print(f"\n💰 Importing {len(payments_list)} payment records...")
        imported = 0
        skipped = 0
        
        for payment in payments_list:
            sql = """
            INSERT INTO payments 
            (id, user_id, amount, payment_method, status, created_at, completed_at, mpesa_receipt_number)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE updated_at = NOW()
            """
            
            params = (
                str(payment['id']),
                str(payment['user_id']),
                float(payment['amount']),
                str(payment['payment_method']),
                str(payment['status']),
                str(payment['created_at']),
                str(payment['completed_at']) if payment.get('completed_at') else None,
                str(payment['mpesa_receipt_number']) if payment.get('mpesa_receipt_number') else None,
            )
            
            if not dry_run:
                result = self.execute(sql, params)
                if result is not None:
                    imported += 1
                else:
                    skipped += 1
            else:
                imported += 1
        
        print(f"   ✓ Imported: {imported}, Skipped: {skipped}")
        return imported
    
    def import_customers(self, customers_list, dry_run=False):
        """Import customer records."""
        if not customers_list:
            print("⚠️  No customers to import")
            return 0
        
        print(f"\n👥 Importing {len(customers_list)} customer records...")
        imported = 0
        skipped = 0
        
        for idx, customer in enumerate(customers_list):
            sql = """
            INSERT INTO users 
            (id, first_name, last_name, email, phone_number, role, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, 'customer', 1, NOW())
            ON DUPLICATE KEY UPDATE updated_at = NOW()
            """
            
            phone = f"+254{7 + (idx % 2)}{str(idx).zfill(8)}"
            
            params = (
                str(customer['id']),
                str(customer['first_name']),
                str(customer['last_name']),
                str(customer['email']),
                phone,
            )
            
            if not dry_run:
                result = self.execute(sql, params)
                if result is not None:
                    imported += 1
                else:
                    skipped += 1
            else:
                imported += 1
        
        print(f"   ✓ Imported: {imported}, Skipped: {skipped}")
        return imported
    
    def import_revenue_history(self, revenue_list, dry_run=False):
        """Import revenue history as insights."""
        if not revenue_list:
            print("⚠️  No revenue data to import")
            return 0
        
        print(f"\n📈 Importing {len(revenue_list)} months of revenue history...")
        imported = 0
        skipped = 0
        
        for revenue in revenue_list:
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
            
            params = (
                'revenue_history',
                insight_json,
                period_start,
                period_end,
            )
            
            if not dry_run:
                result = self.execute(sql, params)
                if result is not None:
                    imported += 1
                else:
                    skipped += 1
            else:
                imported += 1
        
        print(f"   ✓ Imported: {imported}, Skipped: {skipped}")
        return imported
    
    def import_churn_insights(self, customers_list, dry_run=False):
        """Import churn risk scores."""
        print(f"\n⚠️  Importing churn risk scores...")
        imported = 0
        skipped = 0
        
        for customer in customers_list:
            if float(customer.get('churn_score', 0)) > 0.3:
                sql = """
                INSERT INTO ai_insights 
                (prediction_type, user_id, score, insight_data, is_flagged, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE updated_at = NOW()
                """
                
                risk_level = 'HIGH' if customer['churn_score'] >= 0.7 else 'MEDIUM'
                
                insight_json = json.dumps({
                    'payment_delay_count': customer['payment_delay_count'],
                    'ticket_count': customer['ticket_count'],
                    'usage_trend': customer['usage_trend'],
                    'subscription_age_days': customer['subscription_age_days'],
                    'risk_level': risk_level,
                    'reasons': [
                        f"Payment delays: {customer['payment_delay_count']}",
                        f"Support tickets: {customer['ticket_count']}",
                        f"Usage trend: {customer['usage_trend']}",
                    ]
                })
                
                params = (
                    'churn_risk',
                    str(customer['id']),
                    float(customer['churn_score']),
                    insight_json,
                    1 if customer['churn_score'] >= 0.7 else 0,
                )
                
                if not dry_run:
                    result = self.execute(sql, params)
                    if result is not None:
                        imported += 1
                    else:
                        skipped += 1
                else:
                    imported += 1
        
        print(f"   ✓ Imported: {imported}, Skipped: {skipped}")
        return imported
    
    def run_import(self, json_file, dry_run=False):
        """Main import routine."""
        # Load JSON
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
        except FileNotFoundError:
            print(f"❌ File not found: {json_file}")
            return False
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {e}")
            return False
        
        print("\n" + "=" * 70)
        print("🚀 Importing Training Data into ISP Billing Database")
        print("=" * 70)
        print(f"📁 File: {json_file}")
        print(f"📋 Mode: {'DRY RUN' if dry_run else 'REAL IMPORT'}")
        print(f"Generated: {data.get('generated_at', 'Unknown')}")
        print("\nData Summary:")
        for key, value in data.get('summary', {}).items():
            print(f"   {key}: {value}")
        print("=" * 70)
        
        # Connect
        if not self.connect():
            return False
        
        # Import
        total = 0
        try:
            total += self.import_customers(data.get('customers', []), dry_run)
            total += self.import_payments(data.get('payments', []), dry_run)
            total += self.import_revenue_history(data.get('revenue', []), dry_run)
            total += self.import_churn_insights(data.get('customers', []), dry_run)
            
            print("\n" + "=" * 70)
            if dry_run:
                print(f"✅ DRY RUN COMPLETE - Would import {total} records")
                print("\nTo actually import, run without --dry-run:")
                print(f"   python simple_importer.py {json_file}")
            else:
                print(f"✅ IMPORT COMPLETE - {total} records imported")
            print("=" * 70)
        
        except Exception as e:
            print(f"❌ Import failed: {e}")
            return False
        finally:
            self.disconnect()
        
        return True


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Import training data into database')
    parser.add_argument('file', help='Path to training_data.json')
    parser.add_argument('--dry-run', action='store_true', help='Simulate import without making changes')
    parser.add_argument('--host', default='localhost', help='Database host')
    parser.add_argument('--user', default='root', help='Database user')
    parser.add_argument('--password', default='', help='Database password')
    parser.add_argument('--database', default='isp_billing_db', help='Database name')
    
    args = parser.parse_args()
    
    importer = TrainingDataImporter(
        host=args.host,
        user=args.user,
        password=args.password,
        database=args.database
    )
    
    success = importer.run_import(args.file, dry_run=args.dry_run)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
