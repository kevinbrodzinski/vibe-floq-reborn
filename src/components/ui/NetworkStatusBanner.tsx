import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function NetworkStatusBanner() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [showOffline, setShowOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOffline(true);
      setShowReconnected(false);
    } else if (showOffline) {
      // Coming back online
      setShowOffline(false);
      setShowReconnected(true);
      
      // Hide reconnected message after 3 seconds
      const timeout = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [isOnline, showOffline]);

  if (!showOffline && !showReconnected) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 p-3 text-center text-sm font-medium ${
        showOffline 
          ? 'bg-destructive text-destructive-foreground' 
          : 'bg-green-500 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {showOffline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>No Internet Connection</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" />
            <span>Back Online</span>
            {isSlowConnection && <span className="text-xs opacity-75">(Slow)</span>}
          </>
        )}
      </div>
    </motion.div>
  );
}