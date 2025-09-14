'use client';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { recordRouteChange } from '@/core/context/recordRouteChange';
import { safeParams } from '@/lib/ledger/sanitize';

export function useLedgerReactRouter() {
  const location = useLocation();
  const navType = useNavigationType(); // POP / PUSH / REPLACE
  const prevPathRef = useRef<string>(location.pathname + location.search);

  useEffect(() => {
    const to = location.pathname + location.search;
    const from = prevPathRef.current;

    // click → nav latency if a link wrapper set window.__nav_t0
    const t0 = (window as any).__nav_t0 as number | undefined;
    const latency = t0 ? Math.max(0, performance.now() - t0) : undefined;
    if (t0) (window as any).__nav_t0 = undefined;

    recordRouteChange(from, to, latency, safeParams(location.search));

    prevPathRef.current = to;
  }, [location, navType]);
}