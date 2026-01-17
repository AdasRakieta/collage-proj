#!/usr/bin/env python3
"""
Setup Journey Planner PostgreSQL Database
Creates database, user, and initializes schema
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys

# Database connection parameters
DB_HOST = "192.168.1.218"
DB_PORT = 5432
DB_ADMIN_USER = "admin"
DB_ADMIN_PASSWORD = "Qwuizzy123."

# New database configuration
NEW_DB_NAME = "journey_planner"
NEW_DB_USER = "journey_user"
NEW_DB_PASSWORD = "QWERasdf1234!@#$"

def create_database_and_user():
    """Create new database and user"""
    print(f"🔌 Connecting to PostgreSQL at {DB_HOST}:{DB_PORT}...")
    
    try:
        # Connect to postgres database as admin
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_ADMIN_USER,
            password=DB_ADMIN_PASSWORD,
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{NEW_DB_NAME}'")
        db_exists = cursor.fetchone()
        
        if db_exists:
            print(f"⚠️  Database '{NEW_DB_NAME}' already exists!")
            response = input("Do you want to drop and recreate it? (yes/no): ")
            if response.lower() != 'yes':
                print("❌ Aborted. Exiting...")
                cursor.close()
                conn.close()
                return False
            
            # Drop existing database
            print(f"🗑️  Dropping existing database '{NEW_DB_NAME}'...")
            cursor.execute(f"DROP DATABASE {NEW_DB_NAME}")
            print("✅ Database dropped")
        
        # Check if user exists
        cursor.execute(f"SELECT 1 FROM pg_roles WHERE rolname = '{NEW_DB_USER}'")
        user_exists = cursor.fetchone()
        
        if not user_exists:
            # Create user
            print(f"👤 Creating user '{NEW_DB_USER}'...")
            cursor.execute(f"CREATE USER {NEW_DB_USER} WITH PASSWORD '{NEW_DB_PASSWORD}'")
            print("✅ User created")
        else:
            print(f"✅ User '{NEW_DB_USER}' already exists")
            print(f"🔑 Updating password for '{NEW_DB_USER}'...")
            cursor.execute(f"ALTER USER {NEW_DB_USER} WITH PASSWORD '{NEW_DB_PASSWORD}'")
            print("✅ Password updated")
        
        # Create database
        print(f"🗄️  Creating database '{NEW_DB_NAME}'...")
        cursor.execute(f"CREATE DATABASE {NEW_DB_NAME} OWNER {NEW_DB_USER}")
        print("✅ Database created")
        
        # Grant privileges
        print(f"🔐 Granting privileges...")
        cursor.execute(f"GRANT ALL PRIVILEGES ON DATABASE {NEW_DB_NAME} TO {NEW_DB_USER}")
        print("✅ Privileges granted")
        
        cursor.close()
        conn.close()
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def initialize_schema():
    """Initialize database schema from init.sql"""
    print(f"\n📝 Initializing database schema...")
    
    try:
        # Read init.sql file
        init_sql_path = r"C:\Users\pz_przybysz\Documents\git\journey-planner\database\init.sql"
        print(f"📖 Reading schema from {init_sql_path}...")
        
        with open(init_sql_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Connect to new database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=NEW_DB_USER,
            password=NEW_DB_PASSWORD,
            database=NEW_DB_NAME
        )
        cursor = conn.cursor()
        
        # Execute SQL (split by semicolon, skip comments)
        statements = []
        current_statement = []
        
        for line in sql_content.split('\n'):
            line = line.strip()
            
            # Skip empty lines and comments
            if not line or line.startswith('--'):
                continue
            
            # Skip psql meta-commands
            if line.startswith('\\'):
                continue
            
            # Skip CREATE DATABASE/USER commands (already done)
            if 'CREATE DATABASE' in line.upper() or 'CREATE USER' in line.upper():
                continue
            
            current_statement.append(line)
            
            # Check if statement is complete
            if line.endswith(';'):
                statement = ' '.join(current_statement)
                if statement.strip():
                    statements.append(statement)
                current_statement = []
        
        # Execute statements
        print(f"🔨 Executing {len(statements)} SQL statements...")
        for i, statement in enumerate(statements, 1):
            try:
                cursor.execute(statement)
                if i % 5 == 0:
                    print(f"   Processed {i}/{len(statements)} statements...")
            except psycopg2.Error as e:
                # Some statements may fail if objects already exist
                if 'already exists' in str(e).lower():
                    print(f"   ⚠️  Skipped (already exists): {statement[:50]}...")
                else:
                    print(f"   ⚠️  Warning: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✅ Schema initialized successfully!")
        return True
        
    except FileNotFoundError:
        print(f"❌ Could not find init.sql file at {init_sql_path}")
        return False
    except psycopg2.Error as e:
        print(f"❌ Database error during schema initialization: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def verify_setup():
    """Verify database setup"""
    print(f"\n🔍 Verifying database setup...")
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=NEW_DB_USER,
            password=NEW_DB_PASSWORD,
            database=NEW_DB_NAME
        )
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        print(f"\n📊 Created tables ({len(tables)}):")
        for table in tables:
            print(f"   • {table[0]}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "="*50)
        print("✅ DATABASE SETUP COMPLETE!")
        print("="*50)
        print(f"\n📌 Connection details:")
        print(f"   Host:     {DB_HOST}")
        print(f"   Port:     {DB_PORT}")
        print(f"   Database: {NEW_DB_NAME}")
        print(f"   User:     {NEW_DB_USER}")
        print(f"   Password: {NEW_DB_PASSWORD}")
        print("\n💡 Update your .env files with these credentials!")
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Verification failed: {e}")
        return False

def main():
    print("=" * 50)
    print("🚀 JOURNEY PLANNER - DATABASE SETUP")
    print("=" * 50)
    print(f"\nTarget: {DB_HOST}:{DB_PORT}")
    print(f"New Database: {NEW_DB_NAME}")
    print(f"New User: {NEW_DB_USER}\n")
    
    # Step 1: Create database and user
    if not create_database_and_user():
        print("\n❌ Failed to create database and user")
        sys.exit(1)
    
    # Step 2: Initialize schema
    if not initialize_schema():
        print("\n❌ Failed to initialize schema")
        sys.exit(1)
    
    # Step 3: Verify setup
    if not verify_setup():
        print("\n❌ Verification failed")
        sys.exit(1)
    
    print("\n🎉 All done! Your Journey Planner database is ready to use!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user")
        sys.exit(1)
