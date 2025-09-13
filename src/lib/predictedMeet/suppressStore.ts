// Suppression store for predicted meeting points to avoid spam

type SuppressionKey = {
  friendId: string;
  lng: number;
  lat: number;
  timeToMeet: number;
};

const suppressionStore = new Map<string, number>();

export function buildSuppressionKey(key: SuppressionKey): string {
  const lngRounded = Math.round(key.lng * 1000) / 1000; // 3 decimal places
  const latRounded = Math.round(key.lat * 1000) / 1000;
  const etaRounded = Math.round(key.timeToMeet / 10) * 10; // 10s buckets
  return `${key.friendId}-${lngRounded}-${latRounded}-${etaRounded}`;
}

export function shouldSuppress(key: string): boolean {
  const now = Date.now();
  const until = suppressionStore.get(key);
  if (until && until > now) {
    return true;
  }
  
  // Set suppression for 30 seconds
  suppressionStore.set(key, now + 30000);
  return false;
}

export function prune(): void {
  const now = Date.now();
  for (const [key, until] of suppressionStore.entries()) {
    if (until <= now) {
      suppressionStore.delete(key);
    }
  }
}