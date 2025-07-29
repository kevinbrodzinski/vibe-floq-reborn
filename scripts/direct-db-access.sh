#!/bin/bash

# Direct Database Access Script
# Uses the direct PostgreSQL connection string

DATABASE_URL="postgresql://postgres:KPb422$$$@db.reztyrrafsmlvvlqvsqt.supabase.co:5432/postgres"

echo "🔗 Direct Database Access Script"
echo "Using: postgresql://postgres:***@db.reztyrrafsmlvvlqvsqt.supabase.co:5432/postgres"
echo ""

case "$1" in
  "test")
    echo "🧪 Testing database connection..."
    psql "$DATABASE_URL" -c "SELECT version();" 2>/dev/null
    if [ $? -eq 0 ]; then
      echo "✅ Connection successful!"
    else
      echo "❌ Connection failed!"
    fi
    ;;
    
  "schema")
    echo "📋 Showing database schema..."
    psql "$DATABASE_URL" -c "\dt" 2>/dev/null
    ;;
    
  "tables")
    echo "📊 Listing all tables..."
    psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null
    ;;
    
  "backup")
    echo "💾 Creating database backup..."
    pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
    echo "✅ Backup created!"
    ;;
    
  "query")
    if [ -z "$2" ]; then
      echo "❌ Please provide a SQL query"
      echo "Usage: ./scripts/direct-db-access.sh query 'SELECT * FROM users LIMIT 5;'"
      exit 1
    fi
    echo "🔍 Executing query: $2"
    psql "$DATABASE_URL" -c "$2" 2>/dev/null
    ;;
    
  "migrate")
    if [ -z "$2" ]; then
      echo "❌ Please provide a SQL file"
      echo "Usage: ./scripts/direct-db-access.sh migrate path/to/file.sql"
      exit 1
    fi
    echo "🔄 Running migration: $2"
    psql "$DATABASE_URL" -f "$2"
    ;;
    
  "types")
    echo "📝 Generating TypeScript types from database..."
    echo "This will create src/types/database.ts with your current schema"
    
    # Create the types directory if it doesn't exist
    mkdir -p src/types
    
    # Generate types using the direct connection
    # We'll use a simple approach to extract schema info
    echo "Extracting table information..."
    
    # Get table names and their columns
    psql "$DATABASE_URL" -t -c "
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position;
    " > temp_schema.txt
    
    echo "✅ Schema extracted! Check temp_schema.txt for details"
    echo "📝 You can now manually create src/types/database.ts based on your schema"
    echo ""
    echo "💡 Tip: For automatic type generation, you can also use:"
    echo "   npx supabase gen types typescript --project-id reztyrrafsmlvvlqvsqt > src/types/database.ts"
    ;;
    
  *)
    echo "Usage: $0 {test|schema|tables|backup|query|migrate|types}"
    echo ""
    echo "Commands:"
    echo "  test        - Test database connection"
    echo "  schema      - Show database schema"
    echo "  tables      - List all tables"
    echo "  backup      - Create database backup"
    echo "  query       - Execute SQL query (requires query)"
    echo "  migrate     - Run SQL migration file (requires file path)"
    echo "  types       - Generate TypeScript types from database"
    echo ""
    echo "Examples:"
    echo "  ./scripts/direct-db-access.sh test"
    echo "  ./scripts/direct-db-access.sh query 'SELECT COUNT(*) FROM profiles;'"
    echo "  ./scripts/direct-db-access.sh migrate scripts/final-comprehensive-fix.sql"
    echo "  ./scripts/direct-db-access.sh types"
    ;;
esac 