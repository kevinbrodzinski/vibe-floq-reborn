#!/bin/bash

# Floq P2P Systems Test Environment Startup Script
echo "🚀 Starting Floq P2P Systems Test Environment..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Make sure your Supabase environment variables are configured."
    echo "   You'll need:"
    echo "   - VITE_SUPABASE_URL"
    echo "   - VITE_SUPABASE_ANON_KEY"
fi

echo ""
echo "🎯 P2P Test Page will be available at:"
echo "   http://localhost:8080/p2p-test"
echo ""
echo "📋 What you can test:"
echo "   • Enhanced message bubbles with reactions"
echo "   • Real-time typing indicators"
echo "   • Atomic friendship operations"
echo "   • Thread search functionality"
echo "   • Connection health monitoring"
echo "   • Performance metrics"
echo ""
echo "🔧 Before testing, make sure to:"
echo "   1. FIRST run the database audit:"
echo "      supabase/migrations/20250106000001_database_audit.sql"
echo "   2. THEN run the safe migration:"
echo "      supabase/migrations/20250106000002_safe_p2p_enhancements_step1.sql"
echo "   3. Have your Supabase project configured"
echo "   4. Be logged in to test the hooks"
echo ""
echo "⚠️  DO NOT run the original 20250106000000_p2p_enhancements_optimized.sql"
echo "   It has been identified as unsafe due to function conflicts!"
echo ""

# Start the development server
echo "Starting development server..."
npm run dev

# Keep script running
wait