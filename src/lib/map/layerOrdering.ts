import type mapboxgl from "mapbox-gl";

/** Common label-anchors across Mapbox styles, in preferred order */
const DEFAULT_ANCHOR_CANDIDATES = [
  // standard GL styles (v10/v11)
  "poi-label", "poi-labels",
  "place-label", "place-labels", "settlement-label", "settlement-subdivision-label",
  "road-label", "road-number-shield",
  "waterway-label", "waterway-name",
  "natural-point-label", "natural-line-label",
] as const;

/** Heuristic: first symbol layer that renders text (works on many custom styles). */
function firstTextSymbolLayer(map: mapboxgl.Map): string | undefined {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const l of style.layers) {
    if (l.type === "symbol" && (l.layout as any)?.["text-field"]) return l.id;
  }
}

/** Resolve a safe beforeId for inserting symbol-ish layers. */
export function resolveBeforeId(
  map: mapboxgl.Map,
  extraCandidates: string[] = []
): string | undefined {
  const candidates = [...extraCandidates, ...DEFAULT_ANCHOR_CANDIDATES];
  for (const id of candidates) {
    if (map.getLayer(id)) return id;
  }
  // heuristic fallback
  return firstTextSymbolLayer(map);
}

/** Safe addLayer that won't crash if the anchor is missing. */
export function safeAddLayer(
  map: mapboxgl.Map,
  layer: mapboxgl.AnyLayer,
  beforeCandidates: string[] = []
) {
  try {
    const beforeId = resolveBeforeId(map, beforeCandidates);
    // If we found nothing, just add to the top (Mapbox will put it above other layers).
    map.addLayer(layer, beforeId);
  } catch (err) {
    // As a last resort, add with no beforeId at all.
    console.warn("[safeAddLayer] Falling back to top insertion:", (err as Error)?.message);
    try { map.addLayer(layer); } catch (e2) { console.error("[safeAddLayer] add failed:", e2); }
  }
}

/** Safe moveLayer variant (no-throw). */
export function safeMoveLayer(
  map: mapboxgl.Map,
  id: string,
  beforeCandidates: string[] = []
) {
  if (!map.getLayer(id)) return;
  try {
    const beforeId = resolveBeforeId(map, beforeCandidates);
    if (beforeId) map.moveLayer(id, beforeId);
  } catch (err) {
    console.warn("[safeMoveLayer] move skipped:", (err as Error)?.message);
  }
}