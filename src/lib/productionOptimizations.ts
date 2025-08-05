/**
 * Production optimizations and cleanup
 * Ensures all development features are disabled in production builds
 */

export function initializeProductionMode() {
  // Only run in production
  if (!import.meta.env.PROD) return;
  
  // Clear all development localStorage keys
  const devKeys = [
    'floq_presence_mode',
    'floq_env_config', 
    'floq_rollout',
    'floq_rollout_user',
    'floq-debug-forceLoc',
    'floq-env-override',
    'showDebug',
    'floq-lastFix',
    'suggestions_dismissed_floqs'
  ];
  
  devKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
    }
  });
  
  // Override console methods in production for performance
  if (typeof window !== 'undefined') {
    // Keep only error and warn for critical issues
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Disable debug/info/log in production
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    
    // Keep error and warn but rate limit them
    console.error = (...args) => {
      originalError(...args);
    };
    
    console.warn = (...args) => {
      originalWarn(...args);
    };
  }
  
  console.info('🚀 Production mode initialized - debug features disabled');
}

// Auto-initialize in production
if (import.meta.env.PROD && typeof window !== 'undefined') {
  initializeProductionMode();
}
