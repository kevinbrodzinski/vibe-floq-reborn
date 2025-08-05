/**
 * Production Mode Guard
 * Redirects users to a warning page if they try to access debug modes in production
 */

import { useEffect } from 'react';
import { getEnvironmentConfig } from '@/lib/environment';

export const ProductionModeGuard = ({ children }: { children: React.ReactNode }) => {
  const env = getEnvironmentConfig();
  const isProduction = import.meta.env.PROD || 
    (typeof window !== 'undefined' && 
     (window.location.hostname === 'app.floq.com' || 
      window.location.hostname.includes('floq.app') ||
      window.location.hostname.includes('lovableproject.com')));
  
  useEffect(() => {
    // Clear all debug settings in production
    if (isProduction) {
      // Clear localStorage debug settings
      localStorage.removeItem('floq_presence_mode');
      localStorage.removeItem('floq_env_config');
      localStorage.removeItem('floq_rollout');
      localStorage.removeItem('floq_rollout_user');
      localStorage.removeItem('floq-debug-forceLoc');
      localStorage.removeItem('floq-env-override');
      localStorage.removeItem('showDebug');
      
      // Clean URL parameters
      const url = new URL(window.location.href);
      const debugParams = ['presence', 'rollout', 'debug_presence', 'debug_geohash', 'debug_network'];
      let hasDebugParams = false;
      
      debugParams.forEach(param => {
        if (url.searchParams.has(param)) {
          hasDebugParams = true;
          url.searchParams.delete(param);
        }
      });
      
      if (hasDebugParams) {
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [isProduction]);
  
  return <>{children}</>;
};