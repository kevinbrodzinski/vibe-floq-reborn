import { useEffect, useState } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: 'unknown'
  });

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const conn: any =
      (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    const update = () => {
      const slow =
        conn && (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.downlink < 1);

      setStatus({
        isOnline: navigator.onLine,
        isSlowConnection: Boolean(slow),
        connectionType: conn?.effectiveType ?? 'unknown'
      });
    };

    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    conn?.addEventListener?.('change', update);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      conn?.removeEventListener?.('change', update);
    };
  }, []);

  return status;
}