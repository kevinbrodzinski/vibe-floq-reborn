import { onCLS, onINP, onLCP } from 'web-vitals';

export const initPerformanceMonitoring = () => {
  // Remove development-only stats.js overlay for TestFlight
  // Only keep web vitals monitoring for production analytics
  
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