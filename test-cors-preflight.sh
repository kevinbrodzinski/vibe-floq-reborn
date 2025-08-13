#!/bin/bash

# Test CORS preflight for recommend edge function
echo "Testing CORS preflight for recommend edge function..."
echo

PROJECT_REF="reztyrrafsmlvvlqvsqt"
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/recommend"

echo "1. Testing OPTIONS preflight request..."
echo "URL: $FUNCTION_URL"
echo

# Test preflight
curl -i -X OPTIONS \
  -H "Origin: http://localhost:8081" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization, x-client-info, apikey, content-type" \
  "$FUNCTION_URL"

echo
echo "Expected: HTTP/1.1 200 OK with Access-Control-Allow-Origin: http://localhost:8081"
echo

echo "2. Testing actual POST request..."
echo

# Test actual request
curl -i -X POST \
  -H "Origin: http://localhost:8081" \
  -H "Content-Type: application/json" \
  -H "apikey: your-anon-key-here" \
  -d '{"profileId":"550e8400-e29b-41d4-a716-446655440000","lat":34.05,"lng":-118.24,"radiusM":1500,"limit":5}' \
  "$FUNCTION_URL"

echo
echo "Expected: HTTP/1.1 200 OK with JSON response and CORS headers"