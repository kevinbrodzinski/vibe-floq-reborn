#!/bin/bash
# Final production verification

set -e

echo "🔍 Production Environment Verification"
echo "====================================="

# 1. Memory leak smoke test
echo "🧠 Memory usage patterns..."

# Check for common memory leak patterns
POTENTIAL_LEAKS=$(rg -n "(setInterval|setTimeout).*(?!clearInterval|clearTimeout)" src || true)
if [ -n "$POTENTIAL_LEAKS" ]; then
  echo "⚠️  Potential timer leaks detected:"
  echo "$POTENTIAL_LEAKS"
fi

UNCLEANED_LISTENERS=$(rg -n "addEventListener.*(?!removeEventListener)" src || true)
if [ -n "$UNCLEANED_LISTENERS" ]; then
  echo "⚠️  Potential listener leaks detected (verify cleanup):"
  echo "$UNCLEANED_LISTENERS"
fi

# 2. WebGL resource management
echo "🎮 WebGL resource management..."
if ! rg -q "destroy.*children.*true" src/lib/pixi/; then
  echo "⚠️  PIXI destruction may not be thorough"
fi

# 3. Performance regression markers
echo "📊 Performance markers..."

# Check for dev-only logging in production paths
DEV_LOGS=$(rg -n 'console\.(log|debug)' src | grep -v "process\.env\.NODE_ENV.*production" || true)
if [ -n "$DEV_LOGS" ]; then
  echo "⚠️  Unconditional console output (may impact performance):"
  echo "$DEV_LOGS" | head -5
fi

# 4. Bundle size verification
echo "📦 Bundle analysis preparation..."
if [ -d "dist" ]; then
  echo "📊 Build artifacts:"
  du -sh dist/* 2>/dev/null || echo "   No dist directory contents to analyze"
fi

echo ""
echo "✅ Production verification complete"
echo "💡 Next: Test in production environment with real data"