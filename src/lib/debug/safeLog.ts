/**
 * Safe logging utility to prevent DataCloneError in Lovable preview
 * Serializes Request/Response objects before logging
 */

function safeLog(...args: any[]) {
  const serialized = args.map(x => {
    if (x instanceof Request) {
      return {
        type: 'Request',
        url: x.url,
        method: x.method,
        headers: Object.fromEntries(x.headers.entries())
      };
    }
    if (x instanceof Response) {
      return {
        type: 'Response', 
        url: x.url,
        status: x.status,
        statusText: x.statusText,
        headers: Object.fromEntries(x.headers.entries())
      };
    }
    return x;
  });
  console.log(...serialized);
}

// Export for use in other files
export { safeLog };