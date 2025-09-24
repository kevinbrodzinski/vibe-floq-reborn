import type mapboxgl from 'mapbox-gl';

function isGetExpr(x: any): x is any[] {
  return Array.isArray(x) && x[0] === 'get' && typeof x[1] === 'string';
}

/** Normalize a Mapbox filter tree into legacy-friendly ops */
export function normalizeFilter(node: any): any {
  if (!Array.isArray(node)) return node;
  const op = node[0];

  // ["!", ["has","prop"]] -> ["!has","prop"]
  if (op === '!' && Array.isArray(node[1]) && node[1][0] === 'has') {
    const key = isGetExpr(node[1][1]) ? node[1][1][1] : node[1][1];
    return ['!has', key];
  }

  // ["has", ["get","prop"]] -> ["has","prop"]
  if (op === 'has' && isGetExpr(node[1])) {
    return ['has', node[1][1]];
  }

  // ["!has", ["get","prop"]] -> ["!has","prop"]
  if (op === '!has' && isGetExpr(node[1])) {
    return ['!has', node[1][1]];
  }

  // ["==", ["get","prop"], v] -> ["==","prop", v]
  if ((op === '==' || op === '!=') && isGetExpr(node[1])) {
    return [op, node[1][1], normalizeFilter(node[2])];
  }

  // ["in", ["get","prop"], "a","b"] or ["in", ["get","prop"], ["literal",[...]]]
  if ((op === 'in' || op === '!in') && isGetExpr(node[1]) && node.length > 2) {
    const key = node[1][1];
    const values = Array.isArray(node[2]) && node[2][0] === 'literal' && Array.isArray(node[2][1])
      ? node[2][1]
      : node.slice(2);
    // legacy: ["in","prop", ...vals] ; ["!in","prop", ...vals]
    return [op, key, ...values.map(normalizeFilter)];
  }

  // Collapse any remaining ["get","prop"] in binary comparators to "prop"
  if ((op === '>' || op === '>=' || op === '<' || op === '<=') && isGetExpr(node[1])) {
    return [op, node[1][1], normalizeFilter(node[2])];
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

  // Recurse by default
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
