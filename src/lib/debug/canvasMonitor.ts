/**
 * Canvas and WebGL context monitoring for double-mount detection
 */

export function startCanvasMonitoring() {
  if (typeof window === 'undefined') return;
  
  console.log('🔍 Starting canvas monitoring for double-mount detection...');
  
  const monitor = setInterval(() => {
    const canvasCount = document.querySelectorAll('.mapboxgl-canvas').length;
    const mapExists = !!(window as any).__FLOQ_MAP;
    
    console.log(`📊 Canvas count: ${canvasCount}, Map exists: ${mapExists}`);
    
    // Warn about multiple canvases (double mount)
    if (canvasCount > 1) {
      console.warn('🚨 DOUBLE MOUNT DETECTED - Multiple canvas elements found!');
      document.querySelectorAll('.mapboxgl-canvas').forEach((canvas, i) => {
        const rect = canvas.getBoundingClientRect();
        console.log(`  Canvas ${i + 1}: ${rect.width}x${rect.height} visible: ${rect.width > 0 && rect.height > 0}`);
      });
    }
    
    // Stop monitoring after 30 seconds if everything looks stable
    if (canvasCount === 1 && mapExists) {
      setTimeout(() => {
        console.log('✅ Canvas monitoring complete - map stable');
        clearInterval(monitor);
      }, 10000);
    }
  }, 500);
  
  // Auto-stop after 30 seconds regardless
  setTimeout(() => {
    clearInterval(monitor);
    console.log('⏱️ Canvas monitoring timeout');
  }, 30000);
}

// Auto-start in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  setTimeout(startCanvasMonitoring, 1000);
}