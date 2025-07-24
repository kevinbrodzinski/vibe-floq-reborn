import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function NetworkStatusBanner() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [showOffline, setShowOffline] = useState(false);
  const [showBack, setShowBack]       = useState(false);

  /* transitions ---------------------------------------------------- */
  useEffect(() => {
    if (!isOnline) {
      setShowOffline(true);
      setShowBack(false);
    } else if (showOffline) {
      setShowOffline(false);
      setShowBack(true);
      const t = setTimeout(() => setShowBack(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, showOffline]);

  if (!showOffline && !showBack) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] flex justify-center">
      <div className="m-2 px-4 py-1 rounded-full text-xs font-medium
                      backdrop-blur-sm bg-background/80 border border-border">
        {showOffline ? (
          <>📡 No Internet Connection</>
        ) : (
          <>✅ Back Online{isSlowConnection && <span className="ml-1 text-xs text-amber-400">Slow</span>}</>
        )}
      </div>
    </div>
  );
}