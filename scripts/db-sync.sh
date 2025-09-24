#!/bin/bash

# Database Sync Helper Script
# Project ID: reztyrrafsmlvvlqvsqt

PROJECT_ID="reztyrrafsmlvvlqvsqt"

echo "🔄 Supabase Database Sync Helper"
echo "Project: $PROJECT_ID"
echo ""

case "$1" in
  "start")
    echo "🔄 Starting local Supabase (for development only)..."
    supabase start
    echo "✅ Local Supabase started!"
    echo "📊 Dashboard: http://localhost:54323"
    ;;
    
  "stop")
    echo "🛑 Stopping local Supabase..."
    supabase stop
    ;;
    
  "status")
    echo "📊 Checking status..."
    supabase status
    ;;
    
  "pull")
    echo "⬇️  Pulling schema from production..."
    supabase db pull --project-id $PROJECT_ID
    echo "✅ Schema pulled from production!"
    ;;
    
  "push")
    echo "⚠️  WARNING: This will push to PRODUCTION!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "⬆️  Pushing local schema to production..."
      supabase db push --project-id $PROJECT_ID
      echo "✅ Schema pushed to production!"
    else
      echo "❌ Push cancelled"
    fi
    ;;
    
  "types")
    echo "📝 Generating TypeScript types from production..."
    supabase gen types typescript --project-id $PROJECT_ID > src/types/database.ts
    echo "✅ Types generated from production!"
    echo "🔍 Run 'npm run typecheck' to verify compatibility"
    ;;
    
  "types-local")
    echo "📝 Generating local TypeScript types..."
    supabase gen types typescript --local > src/types/database.ts
    echo "✅ Local types generated!"
    ;;
    
  "diff")
    echo "🔍 Comparing local vs remote schema..."
    supabase db diff --project-id $PROJECT_ID
    ;;
    
  "reset")
    echo "🔄 Resetting local database..."
    supabase db reset
    ;;
    
  "migration")
    if [ -z "$2" ]; then
      echo "❌ Please provide migration name"
      echo "Usage: ./scripts/db-sync.sh migration <migration-name>"
      exit 1
    fi
    echo "📝 Creating new migration: $2"
    supabase migration new $2
    ;;
    
  "logs")
    echo "📊 Viewing production logs..."
    supabase logs --project-id $PROJECT_ID
    ;;
    
  "backup")
    echo "💾 Creating production backup..."
    supabase db dump --project-id $PROJECT_ID > backup_$(date +%Y%m%d_%H%M%S).sql
    echo "✅ Production backup created!"
    ;;
    
  *)
    echo "Usage: $0 {start|stop|status|pull|push|types|types-local|diff|reset|migration|logs|backup}"
    echo ""
    echo "Commands:"
    echo "  start        - Start local Supabase (development only)"
    echo "  stop         - Stop local Supabase"
    echo "  status       - Check status"
    echo "  pull         - Pull schema from production"
    echo "  push         - Push schema to production (WARNING: PRODUCTION)"
    echo "  types        - Generate TypeScript types from production"
    echo "  types-local  - Generate TypeScript types from local"
    echo "  diff         - Compare local vs production schema"
    echo "  reset        - Reset local database"
    echo "  migration    - Create new migration (requires name)"
    echo "  logs         - View production logs"
    echo "  backup       - Create production backup"
    echo ""
    echo "Production Workflow:"
    echo "  1. ./scripts/db-sync.sh pull          # Get latest schema"
    echo "  2. ./scripts/db-sync.sh types         # Generate types"
    echo "  3. npm run typecheck                  # Verify compatibility"
    echo "  4. npm run dev                        # Start development"
    echo ""
    echo "Examples:"
    echo "  ./scripts/db-sync.sh pull"
    echo "  ./scripts/db-sync.sh types"
    echo "  ./scripts/db-sync.sh migration add_user_preferences"
    ;;
esac 