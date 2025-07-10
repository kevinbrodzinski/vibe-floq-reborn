/**
 * Production Mode Guard
 * Redirects users to a warning page if they try to access debug modes in production
 */

import { useEffect } from 'react';
import { getEnvironmentConfig } from '@/lib/environment';

export const ProductionModeGuard = ({ children }: { children: React.ReactNode }) => {
  const env = getEnvironmentConfig();
  const isProduction = window.location.hostname === 'app.floq.com' || window.location.hostname.includes('floq.app');
  
  useEffect(() => {
    // Only redirect in production if user is trying to use debug modes
    if (isProduction && env.presenceMode !== 'live') {
      const url = new URL(window.location.href);
      
      // Check if user explicitly set debug modes
      const hasDebugParams = url.searchParams.has('presence') || 
                            localStorage.getItem('floq_presence_mode') ||
                            localStorage.getItem('floq_env_config');
      
      if (hasDebugParams) {
        // Clear debug settings and redirect to clean URL
        localStorage.removeItem('floq_presence_mode');
        localStorage.removeItem('floq_env_config');
        
        // Remove debug params
        url.searchParams.delete('presence');
        url.searchParams.delete('rollout');
        url.searchParams.delete('debug_presence');
        url.searchParams.delete('debug_geohash');
        url.searchParams.delete('debug_network');
        
        // Show warning and redirect
        alert('Debug modes are disabled in production. Redirecting to live mode...');
        window.location.href = url.toString();
      }
    }
  }, [isProduction, env.presenceMode]);
  
  // Don't render anything while checking in production
  if (isProduction && env.presenceMode !== 'live') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Debug Mode Disabled</h1>
          <p className="text-muted-foreground">Debug modes are not available in production.</p>
          <p className="text-muted-foreground">Redirecting to live mode...</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};