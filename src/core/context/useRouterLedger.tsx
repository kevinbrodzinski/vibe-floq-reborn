import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigation } from 'react-router-dom';
import { recordRouteChange, getWorkingSet } from './recordRouteChange';

/**
 * INTERNAL: Single pending navigation tracker (module-level, not per component)
 * Guards multiple nested RouterLedger mounts.
 */
const pending = {
  startTs: 0 as number,
  fromRoute: '' as string,
};

/**
 * RouterLedger
 *
 * Mount this once (inside your <Router>) to:
 *  - push the initial view into WorkingSet
 *  - measure navigation latency (click → paint) using useNavigation()
 *  - write transition facts to the ContextTruthLedger (via recordRouteChange)
 *  - keep the working set's current view updated (route + search params)
 */
export function RouterLedger() {
  const location = useLocation();
  const navigation = useNavigation(); // React Router v6.4+ data routers
  const prev = useRef(location);
  const workingSet = getWorkingSet();

  // --- On first mount, seed working-set with the current view
  useEffect(() => {
    // pushView won't create a transition if there is no previous view
    void workingSet.pushView({
      route: normalizeRoute(location),
      params: location.state as Record<string, unknown> | undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Track when a navigation starts (Data Router sets state === 'loading')
  useEffect(() => {
    if (navigation.state === 'loading' && pending.startTs === 0) {
      pending.startTs = performance.now();
      pending.fromRoute = normalizeRoute(prev.current);
    }
  }, [navigation.state]);

  // --- On location change, compute latency + write fact + update WS
  useEffect(() => {
    const changed = location.key !== prev.current.key || 
                   location.pathname !== prev.current.pathname || 
                   location.search !== prev.current.search;

    if (changed) {
      const to = normalizeRoute(location);
      const from = pending.fromRoute || normalizeRoute(prev.current);

      const latencyMs = pending.startTs
        ? Math.max(0, performance.now() - pending.startTs)
        : undefined;

      // 1) Ledger/WS: record the transition
      void recordRouteChange(from, to, latencyMs, safeParams(location));

      // 2) Keep working-set's current view fresh (e.g., search/selection)
      workingSet.updateView({
        route: to,
        params: safeParams(location),
        scrollY: getScrollYSafe(),
      });

      // reset & advance prev
      pending.startTs = 0;
      pending.fromRoute = '';
      prev.current = location;
    }
  }, [location, workingSet]);

  // --- Optional: keep scroll in view state (cheap + robust)
  useEffect(() => {
    const onScroll = () => {
      workingSet.updateView({ scrollY: getScrollYSafe() });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [workingSet]);

  return null;
}

/**
 * LedgerLink
 *  Drop-in Link replacement that captures "click intent" to improve latency accuracy
 *  on routes that may not go through the Data Router's loading state.
 */
type LedgerLinkProps = React.ComponentProps<typeof Link>;
export function LedgerLink(props: LedgerLinkProps) {
  const location = useLocation();

  const onClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    // If user's handler prevented navigation, don't mark
    if (e.defaultPrevented) {
      props.onClick && props.onClick(e);
      return;
    }
    // Mark start; router will complete measurement on location change
    pending.startTs = performance.now();
    pending.fromRoute = normalizeRoute(location);
    props.onClick && props.onClick(e);
  };

  return <Link {...props} onClick={onClick} />;
}

/* ----------------- helpers ------------------ */

function normalizeRoute(loc: ReturnType<typeof useLocation> | LocationLike): string {
  const path = loc.pathname || '/';
  const search = loc.search ? stripEmptySearch(loc.search) : '';
  return `${path}${search}`;
}

function stripEmptySearch(s: string) {
  // Keep meaningful queries only; "?" or "?=" style edge cases trimmed
  return s && s !== '?' ? s : '';
}

type LocationLike = { pathname: string; search?: string; state?: unknown };

function safeParams(loc: LocationLike | ReturnType<typeof useLocation>) {
  // You may whitelist only safe keys if state contains sensitive fields.
  const state = (loc as any)?.state;
  if (state && typeof state === 'object') {
    try {
      // Shallow copy only JSON-serializable bits
      return JSON.parse(JSON.stringify(state));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function getScrollYSafe(): number {
  try { 
    return window.scrollY ?? window.pageYOffset ?? 0; 
  } catch { 
    return 0; 
  }
}
