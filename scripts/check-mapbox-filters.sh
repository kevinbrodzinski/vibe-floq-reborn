#!/bin/bash
set -e

echo "🔍 Checking for problematic Mapbox filters..."

# Check for expression-style filters that should be literal
FILTER_ISSUES=$(rg --files-with-matches --glob 'src/**/*.{ts,tsx}' \
  "\['(==|!=|>|>=|<|<=|in|!in|has|!has)'\s*,\s*\['get'," || true)

if [ -n "$FILTER_ISSUES" ]; then
  echo "❌ Expression-style property in Mapbox filter detected:"
  echo "$FILTER_ISSUES"
  echo ""
  echo "Use literal property keys instead of ['get', 'property']"
  echo "Example: ['==', 'kind', 'venue'] instead of ['==', ['get', 'kind'], 'venue']"
  exit 1
fi

echo "✅ No problematic Mapbox filters found"