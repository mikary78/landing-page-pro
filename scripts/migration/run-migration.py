#!/usr/bin/env python3
"""
Azure PostgreSQL Migration Script
Executes the SQL migration script on Azure PostgreSQL
"""

import psycopg2
import sys
from pathlib import Path

# Azure PostgreSQL connection
AZURE_CONFIG = {
    'host': 'psql-landing-page-pro.postgres.database.azure.com',
    'database': 'landingpagepro',
    'user': 'pgadmin',
    'password': 'LandingPage2025!@#Strong',
    'port': 5432,
    'sslmode': 'require'
}

def run_migration():
    print("[*] Connecting to Azure PostgreSQL...")

    try:
        # Connect
        conn = psycopg2.connect(**AZURE_CONFIG)
        conn.autocommit = False
        cursor = conn.cursor()

        print("[+] Connected successfully!")

        # Read SQL file
        sql_file = Path(__file__).parent / 'PHASE2-AZURE-POSTGRESQL-MIGRATION.sql'
        print(f"[*] Reading SQL file: {sql_file}")

        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_script = f.read()

        print(f"[*] SQL script size: {len(sql_script)} characters")

        # Execute
        print("[*] Executing migration script...")
        cursor.execute(sql_script)

        conn.commit()
        print("[+] Migration completed successfully!")

        # Verify tables
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)

        tables = cursor.fetchall()
        print(f"\n[+] Created {len(tables)} tables:")
        for table in tables:
            print(f"  - {table[0]}")

        cursor.close()
        conn.close()

        return 0

    except psycopg2.Error as e:
        print(f"[-] Database error: {e}")
        return 1
    except Exception as e:
        print(f"[-] Unexpected error: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(run_migration())
