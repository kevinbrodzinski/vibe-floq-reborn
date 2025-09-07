/**
 * Debug flags for development features
 */

export const debugFieldVectors = (): boolean => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === 'field' || params.has('debug-field');
};

export const isDebugMode = (): boolean => {
  return import.meta.env.DEV && (
    debugFieldVectors() ||
    // Add other debug flags here
    false
  );
};