#!/usr/bin/env bash
set -euo pipefail

# Requirements: curl, jq, bc
# Env vars: SUPABASE_URL, SYNC_VENUES_SECRET
# Optional: RADIUS_M, LIMIT, DENSITY

: "${SUPABASE_URL:?set SUPABASE_URL}"
: "${SYNC_VENUES_SECRET:?set SYNC_VENUES_SECRET}"

RADIUS_M="${RADIUS_M:-2500}"
LIMIT="${LIMIT:-40}"
DENSITY="${DENSITY:-urban}"
OUT="${OUT:-runs_la.csv}"

# LA bbox (approx): lat 33.90..34.20, lng -118.55..-118.10
LAT_MIN=${LAT_MIN:-33.90}
LAT_MAX=${LAT_MAX:-34.20}
LNG_MIN=${LNG_MIN:--118.55}
LNG_MAX=${LNG_MAX:--118.10}

# Step size in degrees (~0.03 ≈ 3.3km lat; ~3km lng at LA lat)
STEP="${STEP:-0.03}"
DRY_RUN="${DRY_RUN:-false}"   # set true to preview

# init CSV header if file missing
if [ ! -f "$OUT" ]; then
  echo "timestamp,lat,lng,run_id,upserted,merged,google,foursquare,dry_run" > "$OUT"
fi

fmt() { printf "%.5f" "$1"; }

echo "Starting LA venue sync..."
echo "Area: ${LAT_MIN} to ${LAT_MAX} lat, ${LNG_MIN} to ${LNG_MAX} lng"
echo "Step: ${STEP} degrees, Radius: ${RADIUS_M}m, Limit: ${LIMIT}, Density: ${DENSITY}"
echo "Dry run: ${DRY_RUN}"
echo "Output: ${OUT}"
echo ""

total_tiles=0
successful_tiles=0

lat="$LAT_MIN"
while (( $(echo "$lat <= $LAT_MAX + 1e-6" | bc -l) )); do
  lng="$LNG_MIN"
  while (( $(echo "$lng <= $LNG_MAX + 1e-6" | bc -l) )); do
    LAT_STR=$(fmt "$lat")
    LNG_STR=$(fmt "$lng")
    total_tiles=$((total_tiles + 1))
    
    echo "[$total_tiles] Syncing @ $LAT_STR,$LNG_STR (dry_run=${DRY_RUN})"
    
    # Call sync-venues function
    RESP=$(curl -sS -X POST "$SUPABASE_URL/functions/v1/sync-venues" \
      -H "x-sync-secret: $SYNC_VENUES_SECRET" \
      -H "Content-Type: application/json" \
      -d "{\"lat\":$LAT_STR,\"lng\":$LNG_STR,\"radius_m\":$RADIUS_M,\"limit\":$LIMIT,\"dry_run\":$DRY_RUN,\"density\":\"$DENSITY\"}" \
      2>/dev/null || echo '{"ok":false,"error":"request_failed"}')
    
    # Parse response
    OK=$(echo "$RESP" | jq -r '.ok // false')
    if [ "$OK" = "true" ]; then
      RUN_ID=$(echo "$RESP" | jq -r '.run_id // "NA"')
      UPS=$(echo "$RESP" | jq -r '.counts.upserted // 0')
      MER=$(echo "$RESP" | jq -r '.counts.merged // 0')
      G=$(echo "$RESP" | jq -r '.counts.google // 0')
      F=$(echo "$RESP" | jq -r '.counts.foursquare // 0')
      successful_tiles=$((successful_tiles + 1))
      echo "  ✓ Success: run_id=$RUN_ID, upserted=$UPS, merged=$MER (G:$G, F:$F)"
    else
      ERROR=$(echo "$RESP" | jq -r '.error // "unknown_error"')
      RUN_ID="ERROR"
      UPS=0
      MER=0
      G=0
      F=0
      echo "  ✗ Failed: $ERROR"
    fi
    
    # Log to CSV
    TS=$(date -Iseconds)
    echo "$TS,$LAT_STR,$LNG_STR,$RUN_ID,$UPS,$MER,$G,$F,$DRY_RUN" >> "$OUT"

    # Small delay to avoid overwhelming the API
    sleep 0.5

    # advance lng
    lng=$(echo "$lng + $STEP" | bc -l)
  done
  # advance lat
  lat=$(echo "$lat + $STEP" | bc -l)
done

echo ""
echo "LA sync complete!"
echo "Total tiles: $total_tiles"
echo "Successful: $successful_tiles"
echo "Failed: $((total_tiles - successful_tiles))"
echo "Results logged to: $OUT"

# Show summary stats if successful
if [ $successful_tiles -gt 0 ]; then
  echo ""
  echo "Summary stats:"
  tail -n +2 "$OUT" | awk -F, -v dry="$DRY_RUN" '
    $9 == dry { 
      total_upserted += $5; 
      total_merged += $6; 
      total_google += $7; 
      total_foursquare += $8; 
      count++ 
    } 
    END { 
      if (count > 0) {
        print "  Total venues upserted: " total_upserted
        print "  Total venues merged: " total_merged  
        print "  Google places fetched: " total_google
        print "  Foursquare places fetched: " total_foursquare
        print "  Average upserted per tile: " (total_upserted / count)
      }
    }'
fi