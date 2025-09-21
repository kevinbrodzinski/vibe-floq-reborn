export function get() { return null; }
export function getEnforcing() { return new Proxy({}, { get: () => () => {} }); }
export default { get, getEnforcing };