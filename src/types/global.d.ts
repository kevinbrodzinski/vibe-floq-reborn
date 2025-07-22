/**
 * Fix for web builds: Override NodeJS types with web-compatible versions
 */

declare global {
  // Override setTimeout to return number (web standard) instead of NodeJS.Timeout
  const setTimeout: WindowOrWorkerGlobalScope['setTimeout'];
  const clearTimeout: WindowOrWorkerGlobalScope['clearTimeout'];
  const setInterval: WindowOrWorkerGlobalScope['setInterval'];
  const clearInterval: WindowOrWorkerGlobalScope['clearInterval'];
  
  // Override the Timeout type to be compatible with web (number)
  type Timeout = number;
  
  // Also override in NodeJS namespace to prevent conflicts
  namespace NodeJS {
    type Timeout = number;
  }
}

export {};