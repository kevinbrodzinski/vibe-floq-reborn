import { useEffect } from 'react';
// This file is for React Native only - requires @react-navigation/native
// Add conditional import to avoid build errors on web
// import type { NavigationContainerRef } from '@react-navigation/native';
import { recordRouteChange } from '@/core/context/recordRouteChange';

/**
 * React Navigation ledger hook for iOS/Android
 * Records route transitions with latency measurement
 * 
 * Usage: Install @react-navigation/native and uncomment the import above
 */
export function useLedgerReactNavigation(navRef: React.RefObject<any>) {
  useEffect(() => {
    const onReady = () => {
      const name = navRef.current?.getCurrentRoute()?.name ?? 'start';
      recordRouteChange('start', name);
    };
    
    const onState = () => {
      const routes = navRef.current?.getRootState().routes ?? [];
      const to = routes[routes.length - 1]?.name ?? 'unknown';
      const t0 = (global as any).__nav_t0 as number | undefined;
      const latency = t0 ? Math.max(0, Date.now() - t0) : undefined;
      (global as any).__nav_t0 = undefined;
      recordRouteChange('unknown', to, latency);
    };

    const r1 = navRef.current?.addListener('ready', onReady);
    const r2 = navRef.current?.addListener('state', onState);
    return () => { 
      r1?.(); 
      r2?.(); 
    };
  }, [navRef]);
}