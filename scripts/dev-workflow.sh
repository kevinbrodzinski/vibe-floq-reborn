#!/bin/bash

# Development Workflow Helper
# Project: reztyrrafsmlvvlqvsqt

echo "🚀 Development Workflow Helper"
echo ""

case "$1" in
  "start")
    echo "🔄 Starting development environment..."
    ./scripts/db-sync.sh start
    echo "📱 Starting development server..."
    npm run dev &
    echo "👀 Starting type checker in watch mode..."
    npm run typecheck --watch &
    echo "✅ Development environment started!"
    echo "📊 Local Supabase: http://localhost:54323"
    echo "🌐 App: http://localhost:3000"
    ;;
    
  "stop")
    echo "🛑 Stopping development environment..."
    ./scripts/db-sync.sh stop
    pkill -f "npm run dev"
    pkill -f "npm run typecheck"
    echo "✅ Development environment stopped!"
    ;;
    
  "test")
    echo "🧪 Running tests..."
    npm test
    ;;
    
  "lint")
    echo "🔍 Running linter..."
    npm run lint
    ;;
    
  "lint-fix")
    echo "🔧 Fixing linting issues..."
    npm run lint --fix
    ;;
    
  "typecheck")
    echo "📝 Running type check..."
    npm run typecheck
    ;;
    
  "build")
    echo "🏗️  Building for production..."
    npm run build
    ;;
    
  "feature")
    if [ -z "$2" ]; then
      echo "❌ Please provide feature name"
      echo "Usage: ./scripts/dev-workflow.sh feature <feature-name>"
      exit 1
    fi
    echo "🌿 Creating feature branch: $2"
    git checkout -b feature/$2
    echo "✅ Feature branch created!"
    ;;
    
  "commit")
    if [ -z "$2" ]; then
      echo "❌ Please provide commit message"
      echo "Usage: ./scripts/dev-workflow.sh commit <message>"
      exit 1
    fi
    echo "💾 Committing changes..."
    git add .
    git commit -m "$2"
    echo "✅ Changes committed!"
    ;;
    
  "push")
    echo "⬆️  Pushing to remote..."
    git push origin $(git branch --show-current)
    echo "✅ Changes pushed!"
    ;;
    
  "pull")
    echo "⬇️  Pulling latest changes..."
    git pull origin main
    echo "✅ Changes pulled!"
    ;;
    
  "reset-db")
    echo "🔄 Resetting local database..."
    ./scripts/db-sync.sh reset
    echo "✅ Database reset!"
    ;;
    
  "generate-types")
    echo "📝 Generating TypeScript types..."
    ./scripts/db-sync.sh types-local
    echo "✅ Types generated!"
    ;;
    
  "check-all")
    echo "🔍 Running all checks..."
    echo "1. TypeScript..."
    npm run typecheck
    echo "2. Linting..."
    npm run lint
    echo "3. Tests..."
    npm test
    echo "✅ All checks completed!"
    ;;
    
  "deploy-staging")
    echo "🚀 Deploying to staging..."
    echo "1. Pushing database changes..."
    ./scripts/db-sync.sh push --project-id [staging-id]
    echo "2. Building frontend..."
    npm run build
    echo "3. Deploying frontend..."
    # Add your staging deployment command here
    echo "✅ Staging deployment complete!"
    ;;
    
  "deploy-prod")
    echo "🚀 Deploying to production..."
    echo "1. Pushing database changes..."
    ./scripts/db-sync.sh push
    echo "2. Generating production types..."
    ./scripts/db-sync.sh types
    echo "3. Building frontend..."
    npm run build
    echo "4. Deploying frontend..."
    # Add your production deployment command here
    echo "✅ Production deployment complete!"
    ;;
    
  "monitor")
    echo "📊 Monitoring deployment..."
    ./scripts/db-sync.sh logs
    ;;
    
  *)
    echo "Usage: $0 {start|stop|test|lint|lint-fix|typecheck|build|feature|commit|push|pull|reset-db|generate-types|check-all|deploy-staging|deploy-prod|monitor}"
    echo ""
    echo "Commands:"
    echo "  start           - Start development environment"
    echo "  stop            - Stop development environment"
    echo "  test            - Run tests"
    echo "  lint            - Run linter"
    echo "  lint-fix        - Fix linting issues"
    echo "  typecheck       - Run type check"
    echo "  build           - Build for production"
    echo "  feature         - Create feature branch"
    echo "  commit          - Commit changes"
    echo "  push            - Push to remote"
    echo "  pull            - Pull latest changes"
    echo "  reset-db        - Reset local database"
    echo "  generate-types  - Generate TypeScript types"
    echo "  check-all       - Run all checks"
    echo "  deploy-staging  - Deploy to staging"
    echo "  deploy-prod     - Deploy to production"
    echo "  monitor         - Monitor deployment"
    echo ""
    echo "Examples:"
    echo "  ./scripts/dev-workflow.sh start"
    echo "  ./scripts/dev-workflow.sh feature new-profile-ui"
    echo "  ./scripts/dev-workflow.sh commit 'feat: add new profile UI'"
    echo "  ./scripts/dev-workflow.sh check-all"
    ;;
esac 