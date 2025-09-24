/**
 * Safe parameter extraction that avoids logging PII
 * Whitelists only non-sensitive keys
 */
export function safeParams(search: string): Record<string, unknown> {
  if (!search || search === '?') return {};
  
  try {
    const params = new URLSearchParams(search);
    const safe: Record<string, unknown> = {};
    
    // Whitelist only non-sensitive parameters
    const allowedKeys = ['view', 'tab', 'sort', 'filter', 'page', 'limit', 'date'];
    
    for (const [key, value] of params.entries()) {
      if (allowedKeys.includes(key)) {
        safe[key] = value;
      }
    }
    
    return safe;
  } catch {
    return {};
  }
}