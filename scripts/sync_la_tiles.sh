#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_URL:?set SUPABASE_URL}"
: "${SYNC_VENUES_SECRET:?set SYNC_VENUES_SECRET}"

RADIUS_M="${RADIUS_M:-2500}"
LIMIT="${LIMIT:-40}"
DENSITY="${DENSITY:-urban}"
OUT="${OUT:-runs_la.csv}"

LAT_MIN=${LAT_MIN:-33.90}
LAT_MAX=${LAT_MAX:-34.20}
LNG_MIN=${LNG_MIN:--118.55}
LNG_MAX=${LNG_MAX:--118.10}

STEP="${STEP:-0.03}"
DRY_RUN="${DRY_RUN:-false}"

if [ ! -f "$OUT" ]; then
  echo "timestamp,lat,lng,run_id,upserted,merged,google,foursquare,dry_run" > "$OUT"
fi

fmt() { printf "%.5f" "$1"; }

lat="$LAT_MIN"
while (( $(echo "$lat <= $LAT_MAX + 1e-6" | bc -l) )); do
  lng="$LNG_MIN"
  while (( $(echo "$lng <= $LNG_MAX + 1e-6" | bc -l) )); do
    LAT_STR=$(fmt "$lat")
    LNG_STR=$(fmt "$lng")
    echo "Sync @ $LAT_STR,$LNG_STR (dry_run=${DRY_RUN})"
    RESP=$(curl -sS -X POST "$SUPABASE_URL/functions/v1/sync_venues" \
      -H "x-sync-secret: $SYNC_VENUES_SECRET" \
      -H "Content-Type: application/json" \
      -d "{\"lat\":$LAT_STR,\"lng\":$LNG_STR,\"radius_m\":$RADIUS_M,\"limit\":$LIMIT,\"dry_run\":$DRY_RUN,\"density\":\"$DENSITY\"}")
    RUN_ID=$(echo "$RESP" | jq -r '.run_id // "NA"')
    UPS=$(echo "$RESP" | jq -r '.counts.upserted // 0')
    MER=$(echo "$RESP" | jq -r '.counts.merged // 0')
    G=$(echo "$RESP" | jq -r '.counts.google // 0')
    F=$(echo "$RESP" | jq -r '.counts.foursquare // 0')
    TS=$(date -Iseconds)
    echo "$TS,$LAT_STR,$LNG_STR,$RUN_ID,$UPS,$MER,$G,$F,$DRY_RUN" >> "$OUT"

    lng=$(echo "$lng + $STEP" | bc -l)
  done
  lat=$(echo "$lat + $STEP" | bc -l)

done

echo "Done. Logged to $OUT"