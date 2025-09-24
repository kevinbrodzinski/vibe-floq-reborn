'use client';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { recordRouteChange, getWorkingSet } from '@/core/context/recordRouteChange';
import { safeParams } from '@/lib/ledger/sanitize';

function getScrollYSafe(): number {
  try { 
    return window.scrollY ?? window.pageYOffset ?? 0; 
  } catch { 
    return 0; 
  }
}

export function useLedgerReactRouter() {
  const location = useLocation();
  const navType = useNavigationType(); // POP / PUSH / REPLACE
  const prevPathRef = useRef<string>(location.pathname + location.search);

  useEffect(() => {
    const changed = location.pathname + location.search !== prevPathRef.current;
    
    if (changed) {
      // Debounce rapid navigation changes
      clearTimeout((window as any).__ledger_rt);
      (window as any).__ledger_rt = setTimeout(() => {
        const to = location.pathname + location.search;
        const from = prevPathRef.current;

        // click → nav latency if a link wrapper set window.__nav_t0
        const t0 = (window as any).__nav_t0 as number | undefined;
        const latency = t0 ? Math.max(0, performance.now() - t0) : undefined;
        if (t0) (window as any).__nav_t0 = undefined;

        recordRouteChange(from, to, latency, safeParams(location.search));
        
        // Update working set with current state
        getWorkingSet().updateView({
          route: to,
          params: safeParams(location.search),
          scrollY: getScrollYSafe(),
        });

        prevPathRef.current = to;
      }, 16); // one frame debounce
    }
  }, [location, navType]);
}