#!/bin/bash
# Comprehensive ship-readiness check for FLOQ

set -e

echo "🚀 FLOQ Ship-Readiness Check"
echo "=============================="

# Event naming consistency
echo "🏷️  Event naming consistency..."
BRACKETED_EVENTS=$(rg -n "'\\[Events\\.(FLOQ_LAYER_TOGGLE|FLOQ_LAYER_SET)\\]'" src | grep -v "src/services/eventBridge.ts" || true)
if [ -n "$BRACKETED_EVENTS" ]; then
  echo "❌ Found bracketed event labels outside eventBridge.ts:"
  echo "$BRACKETED_EVENTS"
  exit 1
fi
echo "✅ Event naming consistent"

# TypeScript compilation
echo "📝 TypeScript compilation..."
npm run typecheck

# ESLint checks
echo "🔍 ESLint validation..."
npm run lint

# Mapbox filter validation
echo "🗺️  Mapbox filter patterns..."
./scripts/check-mapbox-filters.sh

# Event system duplicates check
echo "📡 Checking event system duplicates..."
duplicates=$(grep -r "export const.*FLOQ_LAYER_\(TOGGLE\|SET\)" src/ | grep -v "src/services/eventBridge.ts" || true)
if [ -n "$duplicates" ]; then
  echo "❌ Duplicate event exports found:"
  echo "$duplicates"
  exit 1
fi
echo "✅ Event system clean"

# PIXI lifecycle validation
echo "🎮 Validating PIXI lifecycle patterns..."
if ! grep -q "private ready = false" src/lib/pixi/systems/TimeCrystal.ts; then
  echo "❌ TimeCrystal missing ready flag"
  exit 1
fi
if ! grep -q "private pending: any\[\] = \[\]" src/lib/pixi/systems/TimeCrystal.ts; then
  echo "❌ TimeCrystal missing pending queue"
  exit 1
fi
echo "✅ PIXI lifecycle patterns validated"

# Memory leak check (quick)
echo "🧠 Memory pattern validation..."
DIRECT_ADDLAYER=$(rg -n "map\.addLayer\(" src | rg -v "addLayerSafe" || true)
if [ -n "$DIRECT_ADDLAYER" ]; then
  echo "⚠️  Direct addLayer calls found (prefer addLayerSafe):"
  echo "$DIRECT_ADDLAYER"
fi

# Testing
echo "🧪 Running regression tests..."
npm test

# Build verification
echo "🔨 Running production build..."
npm run build
echo "✅ Production build successful"

echo ""
echo "🎉 ALL CHECKS PASSED!"
echo "📊 System Status:"
echo "  - TypeScript: ✅ Clean"
echo "  - ESLint: ✅ Protected"
echo "  - Mapbox Filters: ✅ Secure"
echo "  - Event System: ✅ Deduplicated"
echo "  - PIXI Lifecycle: ✅ Bulletproof"
echo "  - Build: ✅ Ready"
echo ""
echo "🚢 Ready to ship!"