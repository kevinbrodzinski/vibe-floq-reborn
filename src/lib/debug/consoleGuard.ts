/**
 * Global safeguard against DataCloneError in Lovable preview
 * This prevents Request/Response objects from being cloned by the console proxy
 */

// Only apply this fix in development/preview environments
if (import.meta.env.DEV || window.location.hostname.includes('lovable')) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const safeClone = (arg: any): any => {
    if (arg instanceof Request) {
      return {
        type: 'Request',
        url: arg.url,
        method: arg.method,
        headers: Object.fromEntries(arg.headers.entries())
      };
    }
    if (arg instanceof Response) {
      return {
        type: 'Response',
        url: arg.url,
        status: arg.status,
        statusText: arg.statusText,
        headers: Object.fromEntries(arg.headers.entries())
      };
    }
    return arg;
  };

  console.log = (...args: any[]) => {
    const safeArgs = args.map(safeClone);
    originalLog.apply(console, safeArgs);
  };

  console.warn = (...args: any[]) => {
    const safeArgs = args.map(safeClone);
    originalWarn.apply(console, safeArgs);
  };

  console.error = (...args: any[]) => {
    const safeArgs = args.map(safeClone);
    originalError.apply(console, safeArgs);
  };

  if (import.meta.env.DEV) {
    console.log('[🔧 DataCloneError Fix] Console safeguard applied for Lovable preview');
  }
}