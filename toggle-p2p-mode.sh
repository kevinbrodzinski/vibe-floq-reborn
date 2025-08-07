#!/bin/bash

# Toggle P2P Test Page between test and production modes
FILE="/workspace/src/pages/P2PTestPage.tsx"

if grep -q "const isTestMode = true" "$FILE"; then
    # Switch to production mode
    sed -i 's/const isTestMode = true/const isTestMode = false/' "$FILE"
    echo "✅ Switched to PRODUCTION mode"
    echo "   - Real database connections enabled"
    echo "   - Live realtime subscriptions active"
    echo "   - All operations use Supabase APIs"
elif grep -q "const isTestMode = false" "$FILE"; then
    # Switch to test mode
    sed -i 's/const isTestMode = false/const isTestMode = true/' "$FILE"
    echo "✅ Switched to TEST mode"
    echo "   - Mock data enabled"
    echo "   - Realtime subscriptions disabled"
    echo "   - Safe testing environment"
else
    echo "❌ Could not find isTestMode variable in $FILE"
    exit 1
fi

echo ""
echo "🔄 Refresh your browser to see the changes"
echo "📍 Visit: http://localhost:8080/p2p-test"