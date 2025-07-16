import { onCLS, onINP, onLCP } from 'web-vitals';

export const initPerformanceMonitoring = () => {
  if (import.meta.env.DEV) {
    // Stats.js overlay for development
    import('stats.js').then(({ default: Stats }) => {
      const stats = new Stats();
      stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
      document.body.appendChild(stats.dom);
      
      function animate() {
        stats.update();
        requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    });
  }

  // Web Vitals monitoring
  onCLS((metric) => {
    console.log('CLS:', metric);
    // TODO: Send to analytics
  });

  onINP((metric) => {
    console.log('INP:', metric);
    // TODO: Send to analytics
  });

  onLCP((metric) => {
    console.log('LCP:', metric);
    // TODO: Send to analytics
  });
};

export const createPerformanceObserver = (callback: (entries: PerformanceEntry[]) => void) => {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries());
    });
    
    observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    return observer;
  }
  return null;
};