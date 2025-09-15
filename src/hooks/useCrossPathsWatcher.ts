import { useEffect, useMemo, useRef } from 'react';
import { Friend } from '@/types/presence';
import { haversineMeters } from '@/lib/geo/haversine';

type Options = {
  bestieRadiusM?: number;
  friendRadiusM?: number;
  cooldownMin?: number;
  throttleMs?: number;
};

const DEFAULTS = {
  bestieRadiusM: 200,
  friendRadiusM: 400,
  cooldownMin: 45,
  throttleMs: 5000,
} satisfies Required<Options>;

export function useCrossPathsWatcher(
  my: { lat?: number; lng?: number } | null,
  friends: Friend[] | null,
  opts?: Options
) {
  const lastSeenRef = useRef<Record<string, number>>({});
  const lastRun = useRef(0);
  const { bestieRadiusM, friendRadiusM, cooldownMin, throttleMs } = {
    ...DEFAULTS,
    ...(opts || {}),
  };

  // React when coordinates actually change (not just array length)
  const depKey = useMemo(() => {
    const mine =
      my?.lat && my?.lng
        ? `${my.lat.toFixed(5)},${my.lng.toFixed(5)}`
        : 'none';
    const fs = (friends || [])
      .map(
        (f) =>
          `${f.id}:${(f.lat ?? 0).toFixed(5)},${(f.lng ?? 0).toFixed(
            5
          )}:${f.tier ?? ''}`
      )
      .join('|');
    return `${mine}|${fs}`;
  }, [my?.lat, my?.lng, friends]);

  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard
    if (!my?.lat || !my?.lng || !Array.isArray(friends) || friends.length === 0)
      return;

    const now = Date.now();
    if (now - lastRun.current < throttleMs) return; // light throttle
    lastRun.current = now;

    const seen = lastSeenRef.current;
    for (const f of friends) {
      if (!Number.isFinite(f.lat!) || !Number.isFinite(f.lng!)) continue;

      const d = haversineMeters(
        { lat: my.lat!, lng: my.lng! },
        { lat: f.lat!, lng: f.lng! }
      );
      const limit =
        f.tier === 'bestie' ? bestieRadiusM : f.tier === 'friend' ? friendRadiusM : 0;
      if (limit <= 0) continue;

      const cooling = (seen[f.id] ?? 0) + cooldownMin * 60_000 > now;
      if (d <= limit && !cooling) {
        seen[f.id] = now;
        window.dispatchEvent(
          new CustomEvent('floq:nearby_banner', {
            detail: { id: f.id, distanceM: d, tier: f.tier },
          })
        );
      }
    }
  }, [depKey, bestieRadiusM, friendRadiusM, cooldownMin, throttleMs]);
}