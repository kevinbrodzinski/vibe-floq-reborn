/**
 * Debug utilities for tracking component re-renders
 */

let renderCounts = new Map<string, number>();
let lastRenderTimes = new Map<string, number>();

export function trackRender(componentName: string, reason?: string) {
  if (import.meta.env.PROD) return; // Only track in development
  
  const now = Date.now();
  const count = (renderCounts.get(componentName) || 0) + 1;
  const lastTime = lastRenderTimes.get(componentName) || now;
  const timeSinceLastRender = now - lastTime;
  
  renderCounts.set(componentName, count);
  lastRenderTimes.set(componentName, now);
  
  // Warn about frequent re-renders
  if (timeSinceLastRender < 100 && count > 3) {
    console.warn(`🔄 [${componentName}] Frequent re-renders detected! Count: ${count}, Last: ${timeSinceLastRender}ms ago`, reason ? `Reason: ${reason}` : '');
  } else if (count % 5 === 0) {
    console.log(`🔄 [${componentName}] Render #${count}`, reason ? `Reason: ${reason}` : '');
  }
}

export function getRenderStats() {
  console.group('🔄 Component Render Stats');
  for (const [component, count] of renderCounts.entries()) {
    const lastTime = lastRenderTimes.get(component);
    const timeSinceLastRender = lastTime ? Date.now() - lastTime : 0;
    console.log(`${component}: ${count} renders (last: ${timeSinceLastRender}ms ago)`);
  }
  console.groupEnd();
}

export function clearRenderStats() {
  renderCounts.clear();
  lastRenderTimes.clear();
  console.log('🧹 Render stats cleared');
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).floqDebug = {
    ...(window as any).floqDebug,
    getRenderStats,
    clearRenderStats
  };
}