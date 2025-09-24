// tiny in-mem cache – TTL 45 s
type Key = `${number}|${number}|${number}|${number}`;
const store = new Map<Key, { expires: number; secs: number }>();

export async function getETA(
  from: [number, number],
  to: [number, number],
): Promise<number | null> {
  // Normalize coordinates to 5 decimal places for consistent cache keys
  const normalizeCoord = (coord: number) => Math.round(coord * 1e5) / 1e5;
  const fromNorm: [number, number] = [normalizeCoord(from[0]), normalizeCoord(from[1])];
  const toNorm: [number, number] = [normalizeCoord(to[0]), normalizeCoord(to[1])];
  
  const key: Key = `${fromNorm[0]}|${fromNorm[1]}|${toNorm[0]}|${toNorm[1]}`;
  const now = Date.now();

  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.secs;

  // fall-back straight-line if Mapbox fails
  const fallback = () => {
    if (fromNorm[0] === toNorm[0] && fromNorm[1] === toNorm[1]) return 0;
    
    // Fixed Haversine: scale longitude by cos(latitude)
    const R = 111_000; // meters per degree
    const meanLat = (fromNorm[0] + toNorm[0]) * 0.5 * (Math.PI / 180);
    const dx = (fromNorm[1] - toNorm[1]) * R * Math.cos(meanLat);
    const dy = (fromNorm[0] - toNorm[0]) * R;
    
    return Math.sqrt(dx * dx + dy * dy) / 1.4; // walking speed estimate
  };

  try {
    // TODO: Consider static import if build size becomes an issue
    const { default: Directions } = await import('@mapbox/mapbox-sdk/services/directions');
    const directions = Directions({ accessToken: import.meta.env.VITE_MAPBOX_TOKEN });
    const { body } = await directions.getDirections({
      profile: 'mapbox/driving',
      waypoints: [
        { coordinates: fromNorm },
        { coordinates: toNorm },
      ],
      annotations: ['duration'],
      overview: 'false',
    }).send();

    const secs = body?.routes?.[0]?.duration ?? fallback();
    store.set(key, { expires: now + 45_000, secs });
    return secs;
  } catch {
    return fallback();
  }
}