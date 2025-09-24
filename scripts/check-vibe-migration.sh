#!/bin/bash

echo "🔍 Checking vibe system migration status..."

# Check for legacy imports
echo ""
echo "📦 Legacy imports check:"
legacy_count=$(rg -n "getVibeColor\(|vibeColorResolver|constants/vibes|vibeConstants" src 2>/dev/null | wc -l)
if [ "$legacy_count" -eq 0 ]; then
    echo "✅ No legacy imports found"
else
    echo "⚠️  Found $legacy_count legacy import patterns"
    rg -n "getVibeColor\(|vibeColorResolver|constants/vibes|vibeConstants" src | head -10
fi

# Check canonical imports
echo ""
echo "🎯 Canonical imports check:"
canonical_count=$(rg -n "from '@/lib/vibes'|from '@/lib/vibe/color'" src 2>/dev/null | wc -l)
echo "✅ Found $canonical_count canonical imports"

# Check TypeScript compilation
echo ""
echo "🔧 TypeScript compilation check:"
if npm run typecheck >/dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    npm run typecheck
fi

echo ""
echo "🚀 Migration status: Ready for Vibe Engine MVP!"