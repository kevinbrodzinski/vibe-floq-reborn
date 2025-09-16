import type mapboxgl from 'mapbox-gl';

/** Normalize a Mapbox filter tree into supported-ops form */
export function normalizeFilter(node: any): any {
  if (!Array.isArray(node)) return node;
  const op = node[0];

  // Convert ["!", ["has","prop"]] -> ["!has","prop"]
  if (op === '!' && Array.isArray(node[1]) && node[1][0] === 'has' && typeof node[1][1] === 'string') {
    return ['!has', node[1][1]];
  }

  // Convert ["match", ["get","prop"], ["a","b"], true, false] -> ["any", ["==", ["get","prop"], "a"], ["==", ["get","prop"], "b"]]
  if (op === 'match' && Array.isArray(node[1])) {
    const getExpr = node[1]; // ["get","prop"]
    // haystack could be ["literal", [...]] or raw [...]
    const hay = node[2];
    const yes = node[3], no = node[4];
    const arr = Array.isArray(hay) && hay[0] === 'literal' ? hay[1] : hay;
    if (Array.isArray(arr) && yes === true && no === false) {
      return ['any', ...arr.map(val => ['==', normalizeFilter(getExpr), val])];
    }
  }

  // Convert ["in", ["get","prop"], "val1", "val2", ...] -> ["any", ["==", ["get","prop"], "val1"], ["==", ["get","prop"], "val2"], ...]
  if (op === 'in' && Array.isArray(node[1]) && node[1][0] === 'get' && node.length > 2) {
    const getExpr = node[1]; // ["get","prop"]
    const values = node.slice(2); // ["val1", "val2", ...]
    return ['any', ...values.map(val => ['==', normalizeFilter(getExpr), val])];
  }

  // Recurse children
  return node.map(normalizeFilter);
}

/** Safe immediate setFilter (no throw) — returns true if applied */
export function safeSetFilter(map: mapboxgl.Map, id: string, filter: any): boolean {
  try {
    if (map.getLayer(id)) {
      map.setFilter(id, normalizeFilter(filter) as any);
      return true;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`setFilter failed for ${id}`, err, filter);
  }
  return false;
}

/** Apply a filter when the layer is present; retries for a few frames. */
export function setFilterWhenReady(
  map: mapboxgl.Map,
  id: string,
  filter: any,
  maxFrames = 60
) {
  let frames = 0;
  const tick = () => {
    if (map.getLayer(id)) {
      safeSetFilter(map, id, filter);
    } else if (frames++ < maxFrames) {
      requestAnimationFrame(tick);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[safeSetFilter] Layer "${id}" not found after ${maxFrames} frames.`);
    }
  };
  requestAnimationFrame(tick);
}
