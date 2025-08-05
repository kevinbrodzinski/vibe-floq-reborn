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
    if (!arg) return arg;
    
    try {
      if (arg instanceof Request) {
        return {
          _type: 'Request',
          url: arg.url,
          method: arg.method,
          headers: Object.fromEntries(arg.headers.entries())
        };
      }
      if (arg instanceof Response) {
        return {
          _type: 'Response',
          url: arg.url,
          status: arg.status,
          statusText: arg.statusText,
          headers: Object.fromEntries(arg.headers.entries())
        };
      }
      
      // Enhanced Mapbox object handling
      if (arg && typeof arg === 'object') {
        // Mapbox Map objects
        if (arg._container || arg.getStyle || arg.getCenter) {
          return {
            _type: 'MapboxMap',
            container: arg._container ? 'present' : 'missing',
            style: arg.getStyle ? 'loaded' : 'not loaded',
            center: arg.getCenter ? arg.getCenter() : null,
            zoom: arg.getZoom ? arg.getZoom() : null
          };
        }
        // Mapbox Source objects
        if (arg.type === 'geojson' || arg.setData) {
          return {
            _type: 'MapboxSource',
            sourceType: arg.type || 'unknown',
            hasData: !!arg.setData
          };
        }
        // Event objects
        if (arg instanceof Event) {
          return {
            _type: 'Event',
            type: arg.type,
            target: arg.target ? arg.target.constructor.name : null
          };
        }
        // Error objects
        if (arg instanceof Error) {
          return {
            _type: 'Error',
            value: {
              name: arg.name,
              message: arg.message,
              stack: arg.stack
            }
          };
        }
        // HTMLElement objects
        if (arg instanceof HTMLElement) {
          return {
            _type: 'HTMLElement',
            tagName: arg.tagName,
            id: arg.id,
            className: arg.className
          };
        }
      }
      
      return arg;
    } catch (cloneError) {
      // Fallback for any objects that still can't be cloned
      return {
        _type: 'UncloneableObject',
        error: 'Failed to clone object',
        constructor: arg?.constructor?.name || 'Unknown'
      };
    }
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