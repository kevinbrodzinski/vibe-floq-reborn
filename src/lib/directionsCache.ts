// tiny in-mem cache – TTL 45 s
type Key = `${number}|${number}|${number}|${number}`;
const store = new Map<Key, { expires: number; secs: number }>();

export async function getETA(
  from: [number, number],
  to: [number, number],
): Promise<number | null> {
  const key: Key = `${from[0]}|${from[1]}|${to[0]}|${to[1]}`;
  const now = Date.now();

  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.secs;

  // fall-back straight-line if Mapbox fails
  const fallback = () => {
    const dx = (from[0] - to[0]) * 111_000;
    const dy = (from[1] - to[1]) * 111_000;
    return dx === 0 && dy === 0 ? 0 : Math.sqrt(dx * dx + dy * dy) / 1.4;
  };

  try {
    const { default: Directions } = await import('@mapbox/mapbox-sdk/services/directions');
    const directions = Directions({ accessToken: import.meta.env.VITE_MAPBOX_TOKEN });
    const { body } = await directions.getDirections({
      profile: 'mapbox/driving',
      waypoints: [
        { coordinates: from },
        { coordinates: to },
      ],
      annotations: ['duration'],
      overview: 'false',
    }).send();

    const secs =
      body?.routes?.[0]?.duration ?? fallback();
    store.set(key, { expires: now + 45_000, secs });
    return secs;
  } catch {
    return fallback();
  }
}