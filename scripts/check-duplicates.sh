#!/bin/bash
# Regression check for duplicate event identifiers

echo "🔍 Checking for duplicate event identifiers..."

# Check for duplicate event exports outside eventBridge.ts
duplicates=$(grep -r "export const.*FLOQ_LAYER_\(TOGGLE\|SET\)" src/ \
  | grep -v "src/services/eventBridge.ts" || true)

if [ -n "$duplicates" ]; then
  echo "❌ Found duplicate event exports:"
  echo "$duplicates"
  exit 1
fi

# Check TypeScript compilation
echo "🔧 Running TypeScript check..."
if ! npm run typecheck --silent; then
  echo "❌ TypeScript errors found"
  exit 1
fi

echo "✅ All checks passed!"
echo "📊 Event count: $(grep -c ":" src/services/eventBridge.ts)"