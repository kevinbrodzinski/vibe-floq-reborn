import { resolveVibeColor } from '@/lib/vibe/vibeColor';

type RoutePoint = {
  id: string;
  position: [number, number];
  venueId?: string;
  venueName?: string;
  // optional future:
  vibeKey?: string;
  vibeHex?: string;
  color?: string;
};

/** Stamp the resolved vibe color onto a RoutePoint (as `color`). */
export function setVenueVibeForRoute<T extends RoutePoint>(
  point: T,
  vibe: { vibeKey?: string; vibeHex?: string } = {}
): T {
  const color = resolveVibeColor({
    venueId: point.venueId,
    venueName: point.venueName,
    vibeKey: vibe.vibeKey ?? point.vibeKey,
    vibeHex: vibe.vibeHex ?? point.vibeHex,
  });
  return { ...point, color };
}