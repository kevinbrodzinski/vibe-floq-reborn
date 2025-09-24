import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type BannerHit = {
  id: string;                 // friend id
  distanceM?: number;
  tier?: 'bestie' | 'friend';
  name?: string;
};

type Options = {
  showMs?: number;
  dedupeWindowMs?: number;
  storageKey?: string;
};

const DEFAULTS: Required<Options> = {
  showMs: 10_000,
  dedupeWindowMs: 2 * 60_000,
  storageKey: 'floq_banner_snooze_until',
};

const now = () => Date.now();

function getSnoozeUntil(key: string): number {
  try { return Number(localStorage.getItem(key) || 0) || 0; } catch { return 0; }
}
function setSnoozeUntil(key: string, ts: number) {
  try { localStorage.setItem(key, String(ts)); } catch {}
}

export function useBannerQueue(opts?: Options) {
  const { showMs, dedupeWindowMs, storageKey } = { ...DEFAULTS, ...(opts || {}) };

  const [current, setCurrent] = useState<BannerHit | null>(null);
  const queueRef = useRef<BannerHit[]>([]);
  const lastSeenRef = useRef<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snoozed = useMemo(() => now() < getSnoozeUntil(storageKey), [storageKey]);

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

  const next = useCallback(() => {
    clearTimer();
    const q = queueRef.current;
    const n = q.shift() || null;
    setCurrent(n);
    if (n) {
      timerRef.current = setTimeout(() => setCurrent(null), showMs);
    }
  }, [showMs]);

  const dismissCurrent = useCallback(() => setCurrent(null), []);
  const snooze = useCallback((minutes: number) => {
    const until = now() + minutes * 60_000;
    setSnoozeUntil(storageKey, until);
    setCurrent(null);
    queueRef.current = [];
  }, [storageKey]);

  // When current becomes null, show next (if any)
  useEffect(() => {
    if (!current) {
      const t = setTimeout(next, 50); // avoid flicker
      return () => clearTimeout(t);
    }
  }, [current, next]);

  // Listen for hits
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      if (snoozed) return;
      const d = (e as CustomEvent<BannerHit>).detail;
      if (!d?.id) return;

      const last = lastSeenRef.current[d.id] ?? 0;
      if (now() - last < dedupeWindowMs) return; // UI dedupe window
      lastSeenRef.current[d.id] = now();

      queueRef.current.push({
        id: String(d.id),
        name: d.name,
        tier: d.tier === 'bestie' ? 'bestie' : 'friend',
        distanceM: typeof d.distanceM === 'number' ? d.distanceM : undefined,
      });

      if (!current) next();
    };

    window.addEventListener('floq:nearby_banner', handler as EventListener);
    return () => window.removeEventListener('floq:nearby_banner', handler as EventListener);
  }, [current, dedupeWindowMs, next, snoozed]);

  useEffect(() => () => clearTimer(), []);

  return { current, dismissCurrent, snooze, isSnoozed: snoozed };
}