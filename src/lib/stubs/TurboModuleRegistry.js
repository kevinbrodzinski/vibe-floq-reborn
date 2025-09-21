// Minimal TurboModuleRegistry stub for web.
// Satisfies Animated vendor modules (need named 'get') and callers that enforce().
export function get(/* name */) {
  // return null on web; no native turbo modules
  return null;
}

export function getEnforcing(/* name */) {
  // some libs call .getEnforcing('Module'); return a harmless proxy
  return new Proxy({}, { get: () => () => {} });
}

export default { get, getEnforcing };