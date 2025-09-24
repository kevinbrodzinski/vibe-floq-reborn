/* dev-only safety against sandbox HMR stalls */
if (import.meta && (import.meta as any).hot && import.meta.env.DEV) {
  const hot: any = (import.meta as any).hot;
  
  // Reload page if HMR socket disconnects or errors in sandbox
  hot.on?.('vite:ws:disconnect', () => {
    console.warn('[HMR] WebSocket disconnected, reloading page...');
    setTimeout(() => location.reload(), 200);
  });
  
  hot.on?.('vite:error', (err: any) => {
    console.warn('[HMR] Error detected, reloading page...', err);
    setTimeout(() => location.reload(), 100);
  });
}