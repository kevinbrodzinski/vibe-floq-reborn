#!/bin/bash

# 🚀 Floq Development Startup Script
echo "🚀 Starting Floq Development Server..."
echo "================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating from template..."
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo "✅ Created .env.local from .env.example"
        echo "🔧 Please edit .env.local with your Supabase credentials before continuing."
        echo "   Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo ""
        read -p "Press Enter after you've configured .env.local..."
    else
        echo "❌ .env.example not found. Please create .env.local manually."
        exit 1
    fi
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies."
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
fi

# Check if port 8080 is in use
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 8080 is already in use."
    read -p "Kill the process and continue? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Killing process on port 8080..."
        lsof -ti:8080 | xargs kill -9 2>/dev/null || true
        sleep 2
    else
        echo "❌ Cannot start development server. Port 8080 is in use."
        exit 1
    fi
fi

# Start the development server
echo ""
echo "🎉 Starting development server on http://localhost:8080"
echo "================================================"
echo "📝 Available at:"
echo "   • Local:   http://localhost:8080"
echo "   • Network: http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "🔥 Hot Module Replacement (HMR) is enabled"
echo "🎯 Press Ctrl+C to stop the server"
echo "================================================"
echo ""

# Start the dev server
npm run dev