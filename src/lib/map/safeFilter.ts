/**
 * Safe filter normalization for Mapbox GL JS
 * Prevents filter expression errors
 */

export function normalizeFilter(f: any): any {
  if (!Array.isArray(f) || f.length === 0) return f;

  const [op, a, ...rest] = f;

  // Compound logical ops
  if (op === 'all' || op === 'any' || op === 'none') {
    return [op, ...f.slice(1).map(normalizeFilter)];
  }

  // has / !has
  if (op === 'has' || op === '!has') {
    if (Array.isArray(a) && a[0] === 'get') return [op, a[1]];
    return f;
  }

  // Comparators & membership that reference a property on the LHS
  const binaryOps = new Set(['==', '!=', '>', '>=', '<', '<=']);
  const membershipOps = new Set(['in', '!in']);

  // Allow $type literal (style-spec)
  const isTypeLiteral = a === '$type';

  if ((binaryOps.has(op) || membershipOps.has(op)) && (isTypeLiteral ||
      (Array.isArray(a) && a[0] === 'get'))) {
    const prop = isTypeLiteral ? '$type' : a[1];
    return [op, prop, ...rest];
  }

  // Unknown / already-normalized
  return f;
}

/**
 * Safely set filter on a layer, checking if layer exists first
 */
export function safeSetFilter(map: any, layerId: string, filter: any): boolean {
  try {
    if (!map.getLayer(layerId)) {
      return false;
    }
    map.setFilter(layerId, normalizeFilter(filter));
    return true;
  } catch (e) {
    console.warn(`[safeSetFilter] Failed to set filter on ${layerId}:`, e);
    return false;
  }
}

/**
 * Set filter when layer is ready (waits for layer to exist)
 */
export function setFilterWhenReady(map: any, layerId: string, filter: any, maxTries = 40, intervalMs = 50): void {
  let tries = 0;
  const trySet = () => {
    if (safeSetFilter(map, layerId, filter)) return;
    if (++tries >= maxTries) {
      if (import.meta.env.DEV) console.warn(`[setFilterWhenReady] gave up on ${layerId}`);
      return;
    }
    setTimeout(trySet, intervalMs);
  };
  trySet();
}