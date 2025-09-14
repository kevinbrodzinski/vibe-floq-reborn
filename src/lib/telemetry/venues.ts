// Venue-specific telemetry counters
export const venueMetrics = {
  googleHits: 0,
  fsqHits: 0,
  fused: 0,
  rateLimited: 0,
  backoffs: 0,
  gpsFallback: 0,
  clientCacheHits: 0,
  venueFetch: 0,
};

export const incrVenue = (key: keyof typeof venueMetrics, n = 1) => {
  venueMetrics[key] += n;
};

export const snapshotVenueMetrics = () => ({ ...venueMetrics });

export const resetVenueMetrics = () => {
  Object.keys(venueMetrics).forEach(key => {
    (venueMetrics as any)[key] = 0;
  });
};