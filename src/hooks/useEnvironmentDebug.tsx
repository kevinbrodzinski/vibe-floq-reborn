import { useState, useEffect } from 'react';
import { getEnvironmentConfig } from '@/lib/environment';

export function useEnvironmentDebug() {
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const env = getEnvironmentConfig();

  // Keyboard shortcut to open debug panel (Ctrl/Cmd + Shift + E)
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      console.log('🔍 Debug hotkey check:', {
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        target: event.target
      });
      
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'E') {
        console.log('🎯 Environment debug panel triggered!');
        event.preventDefault();
        setIsDebugPanelOpen(prev => {
          const newState = !prev;
          console.log('📱 Panel state changed:', prev, '→', newState);
          return newState;
        });
      }
    };

    console.log('👂 Environment debug hotkey listener registered (Ctrl/Cmd+Shift+E)');
    window.addEventListener('keydown', handleKeydown);
    return () => {
      console.log('🚪 Environment debug hotkey listener removed');
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  // Auto-open debug panel in development if debug flags are enabled
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Force open with URL parameter
    if (urlParams.has('debug_env')) {
      console.log('🌐 Environment debug panel force-opened via URL parameter');
      setIsDebugPanelOpen(true);
      return;
    }
    
    if (import.meta.env.DEV && (env.debugPresence || env.debugNetwork || env.debugGeohash)) {
      // Only auto-open if URL has debug params
      if (urlParams.has('debug_presence') || urlParams.has('debug_network') || urlParams.has('debug_geohash')) {
        console.log('🔧 Environment debug panel auto-opened due to debug flags');
        setIsDebugPanelOpen(true);
      }
    }
  }, [env.debugPresence, env.debugNetwork, env.debugGeohash]);

  // Expose debug helper for manual testing
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__openEnvDebug = () => {
        console.log('🛠️ Manually opening environment debug panel');
        setIsDebugPanelOpen(true);
      };
      console.log('🎛️ Manual trigger available: __openEnvDebug()');
    }
  }, []);

  return {
    isDebugPanelOpen,
    setIsDebugPanelOpen,
    environmentConfig: env,
  };
}