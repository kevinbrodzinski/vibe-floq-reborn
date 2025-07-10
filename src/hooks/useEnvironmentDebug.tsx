import { useState, useEffect } from 'react';
import { getEnvironmentConfig } from '@/lib/environment';

export function useEnvironmentDebug() {
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const env = getEnvironmentConfig();

  // Keyboard shortcut to open debug panel (Ctrl/Cmd + Shift + E)
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        setIsDebugPanelOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  // Auto-open debug panel in development if debug flags are enabled
  useEffect(() => {
    if (import.meta.env.DEV && (env.debugPresence || env.debugNetwork || env.debugGeohash)) {
      // Only auto-open if URL has debug params
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('debug_presence') || urlParams.has('debug_network') || urlParams.has('debug_geohash')) {
        setIsDebugPanelOpen(true);
      }
    }
  }, [env.debugPresence, env.debugNetwork, env.debugGeohash]);

  return {
    isDebugPanelOpen,
    setIsDebugPanelOpen,
    environmentConfig: env,
  };
}