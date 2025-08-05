#!/bin/bash

# TypeScript Types Generation Script
# Uses Supabase CLI to generate types from your database

PROJECT_ID="reztyrrafsmlvvlqvsqt"

echo "📝 TypeScript Types Generation"
echo "Project: $PROJECT_ID"
echo ""

# Create types directory if it doesn't exist
mkdir -p src/types

echo "🔄 Generating TypeScript types from production database..."

# Generate types using Supabase CLI
npx supabase gen types typescript --project-id $PROJECT_ID > src/types/database.ts

if [ $? -eq 0 ]; then
    echo "✅ Types generated successfully!"
    echo "📁 File: src/types/database.ts"
    echo ""
    echo "🔍 TypeScript types include:"
    echo "  - Table definitions"
    echo "  - Row types for SELECT operations"
    echo "  - Insert types for INSERT operations"
    echo "  - Update types for UPDATE operations"
    echo "  - Enum types"
    echo ""
    echo "💡 Usage in your code:"
    echo "  import { createClient } from '@supabase/supabase-js'"
    echo "  import { Database } from './types/database'"
    echo "  const supabase = createClient<Database>(url, key)"
    echo ""
    echo "🧪 Run 'npm run typecheck' to verify compatibility"
else
    echo "❌ Failed to generate types"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  1. Make sure you're logged in: npx supabase login"
    echo "  2. Check your project ID: $PROJECT_ID"
    echo "  3. Verify your access token has the right permissions"
    echo ""
    echo "💡 Alternative: Use direct database access for schema extraction"
    echo "  ./scripts/direct-db-access.sh types"
fi 