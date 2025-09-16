import type mapboxgl from 'mapbox-gl';

/** Normalize a Mapbox filter tree into supported-ops form */
export function normalizeFilter(node: any): any {
  if (!Array.isArray(node)) return node;
  const op = node[0];

  // ["!", ["has","prop"]] -> ["!has","prop"]
  if (op === '!' && Array.isArray(node[1]) && node[1][0] === 'has' && typeof node[1][1] === 'string') {
    return ['!has', node[1][1]];
  }

  // ["match", ["get","prop"], ["a","b"], true, false] -> ["any", ["==", ["get","prop"], "a"], ...]
  if (op === 'match' && Array.isArray(node[1])) {
    const getExpr = node[1];
    const hay = node[2];
    const yes = node[3], no = node[4];
    const arr = Array.isArray(hay) && hay[0] === 'literal' ? hay[1] : hay;
    if (Array.isArray(arr) && yes === true && no === false) {
      return ['any', ...arr.map(v => ['==', normalizeFilter(getExpr), v])];
    }
  }

  // ["in", ["get","prop"], "a","b", ...] -> ["any", ["==", ["get","prop"], "a"], ...]
  if (op === 'in' && Array.isArray(node[1]) && node[1][0] === 'get' && node.length > 2) {
    if (Array.isArray(node[2]) && node[2][0] === 'literal' && Array.isArray(node[2][1])) {
      const values = node[2][1];
      return ['any', ...values.map(v => ['==', normalizeFilter(node[1]), v])];
    }
    const values = node.slice(2);
    return ['any', ...values.map(v => ['==', normalizeFilter(node[1]), v])];
  }

  // ["!in", ["get","prop"], ...] -> ["all", ["!=", ["get","prop"], "a"], ...]
  if (op === '!in' && Array.isArray(node[1]) && node[1][0] === 'get' && node.length > 2) {
    const values = (Array.isArray(node[2]) && node[2][0] === 'literal' && Array.isArray(node[2][1]))
      ? node[2][1]
      : node.slice(2);
    return ['all', ...values.map(v => ['!=', normalizeFilter(node[1]), v])];
  }

  return node.map(normalizeFilter);
}

/** Safe immediate setFilter (no throw) — returns true if applied */
export function safeSetFilter(map: mapboxgl.Map, id: string, filter: any): boolean {
  try {
    if (map.getLayer(id)) {
      const normalized = normalizeFilter(filter);
      map.setFilter(id, normalized as any);
      return true;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[safeSetFilter] Failed for layer "${id}":`, err);
    // eslint-disable-next-line no-console
    console.error(`[safeSetFilter] Original filter:`, filter);
    // eslint-disable-next-line no-console
    console.error(`[safeSetFilter] Normalized filter:`, normalizeFilter(filter));
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

/** Install debug tracer to catch invalid filters (call in DevTools) */
export function installFilterTracer(map: mapboxgl.Map) {
  if ((map as any).__filterTraced) return 'Filter tracer already installed';
  
  const orig = map.setFilter;
  map.setFilter = function(id: string, filter: any) {
    const isValid = !filter || (Array.isArray(filter) && typeof filter[0] === 'string');
    if (!isValid) {
      // eslint-disable-next-line no-console
      console.warn(`[FILTER TRACER] Invalid filter for layer "${id}":`, filter);
      // eslint-disable-next-line no-console
      console.trace('Filter trace');
    }
    return orig.call(this, id, filter);
  };
  (map as any).__filterTraced = true;
  return 'Filter tracer installed - invalid filters will be logged';
}

/** Verify all current filter syntax (call in DevTools) */
export function verifyAllFilters(map: mapboxgl.Map) {
  const layers = map.getStyle()?.layers || [];
  const results: Array<{id: string, filter: any, valid: boolean}> = [];
  
  layers.forEach(layer => {
    const filter = map.getFilter(layer.id);
    const valid = !filter || (Array.isArray(filter) && typeof filter[0] === 'string');
    results.push({ id: layer.id, filter, valid });
  });
  
  const invalid = results.filter(r => !r.valid);
  if (invalid.length === 0) {
    // eslint-disable-next-line no-console
    console.log('✅ All filters are valid');
  } else {
    // eslint-disable-next-line no-console
    console.error(`❌ Found ${invalid.length} invalid filters:`, invalid);
  }
  
  return results;
}
