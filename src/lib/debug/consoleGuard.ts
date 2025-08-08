/**
 * Global safeguard against DataCloneError and enhanced logging
 * This prevents Request/Response objects from being cloned by the console proxy
 * and provides better error details for debugging
 */

// Apply in both dev and production for better error visibility
const shouldApplyGuard = import.meta.env.DEV || 
                        (typeof window !== 'undefined' && 
                         (window.location.hostname.includes('lovable') || 
                          window.location.hostname.includes('localhost')));

if (shouldApplyGuard) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Helper functions
  const isObject = (v: any): v is Record<string, any> => v && typeof v === 'object';

  // Optional: small de-dupe to cut spam (same line repeated fast)
  let lastLogKey = '';
  let lastLogTime = 0;
  const dedupe = (args: any[]) => {
    try {
      const key = JSON.stringify(args, (_, v) => (v instanceof Error ? v.message : v));
      const now = Date.now();
      if (key === lastLogKey && now - lastLogTime < 200) return null; // drop burst
      lastLogKey = key; lastLogTime = now;
    } catch {}
    return args;
  };

  const safeClone = (arg: any): any => {
    if (arg == null) return arg;
    
    try {
      // 1) Requests / Responses
      if (arg instanceof Request) {
        return {
          _type: 'Request',
          url: arg.url,
          method: arg.method,
          headers: Object.fromEntries(arg.headers.entries()),
          // don't touch body
        };
      }
      if (arg instanceof Response) {
        return {
          _type: 'Response',
          url: arg.url,
          status: arg.status,
          statusText: arg.statusText,
          headers: Object.fromEntries(arg.headers.entries()),
        };
      }

      // 2) WebSocket CloseEvent / MessageEvent (more detail!)
      if (typeof CloseEvent !== 'undefined' && arg instanceof CloseEvent) {
        return {
          _type: 'CloseEvent',
          type: arg.type,
          code: arg.code,
          reason: arg.reason,
          wasClean: arg.wasClean,
        };
      }
      if (typeof MessageEvent !== 'undefined' && arg instanceof MessageEvent) {
        return {
          _type: 'MessageEvent',
          type: arg.type,
          // data can be anything; stringify if primitive, otherwise tag it
          data: (typeof arg.data === 'string' || typeof arg.data === 'number' || typeof arg.data === 'boolean')
            ? arg.data
            : Object.prototype.toString.call(arg.data),
        };
      }

      // 3) Generic Event (fallback)
      if (arg instanceof Event) {
        return {
          _type: 'Event',
          type: arg.type,
          target: arg.target ? arg.target.constructor?.name : null,
        };
      }

      // 4) HTML/SVG Elements
      if (typeof HTMLElement !== 'undefined' && arg instanceof HTMLElement) {
        return { _type: 'HTMLElement', tagName: arg.tagName, id: arg.id, className: arg.className };
      }
      if (typeof SVGElement !== 'undefined' && arg instanceof SVGElement) {
        return { _type: 'SVGElement', tagName: arg.tagName, id: (arg as any).id || null };
      }

      // 5) Errors (native) — include cause if present
      if (arg instanceof Error) {
        return {
          _type: 'Error',
          value: {
            name: arg.name,
            message: arg.message,
            stack: arg.stack,
            cause: (arg as any).cause && isObject((arg as any).cause)
              ? { message: (arg as any).cause.message, name: (arg as any).cause.name }
              : undefined,
          },
        };
      }

      // 6) Supabase/PostgREST-shaped errors (not real Error instances)
      if (isObject(arg) && ('message' in arg || 'code' in arg) && ('hint' in arg || 'details' in arg)) {
        const { message, code, hint, details } = arg as any;
        return { _type: 'PostgrestError', message, code, hint, details };
      }

      // 7) Mapbox (existing handling, kept)
      if (isObject(arg)) {
        if ((arg as any)._container || (arg as any).getStyle || (arg as any).getCenter) {
          return {
            _type: 'MapboxMap',
            container: (arg as any)._container ? 'present' : 'missing',
            style: (arg as any).getStyle ? 'loaded' : 'not loaded',
            center: (arg as any).getCenter ? (arg as any).getCenter() : null,
            zoom: (arg as any).getZoom ? (arg as any).getZoom() : null,
          };
        }
        if ((arg as any).type === 'geojson' || (arg as any).setData) {
          return { _type: 'MapboxSource', sourceType: (arg as any).type || 'unknown', hasData: !!(arg as any).setData };
        }
      }

      return arg; // primitives & safe objects
    } catch {
      return {
        _type: 'UncloneableObject',
        error: 'Failed to clone object',
        constructor: arg?.constructor?.name || 'Unknown',
      };
    }
  };

  // Wrap the methods
  const wrap = (fn: (...a: any[]) => void) => (...args: any[]) => {
    const safeArgs = args.map(safeClone);
    const deduped = dedupe(safeArgs);
    if (deduped) fn.apply(console, deduped);
  };

  console.log = wrap(originalLog);
  console.warn = wrap(originalWarn);
  console.error = wrap(originalError);

  console.log('[🔧 Enhanced Console Guard] Applied for better error visibility and WebSocket debugging');
}