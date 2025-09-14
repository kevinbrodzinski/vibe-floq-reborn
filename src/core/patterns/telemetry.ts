export const metrics = {
  pattern: { reads: 0, writes: 0, nudges: 0, socialLearn: 0, sequenceLearn: 0, clusterWrites: 0 },
  venue: { googleHits: 0, fsqHits: 0, fused: 0, rateLimited: 0, backoffs: 0, gpsFallbacks: 0 },
};

export const incr = (k: keyof typeof metrics.pattern | keyof typeof metrics.venue, n=1) => {
  if (k in metrics.pattern) {
    (metrics.pattern as any)[k] += n;
  } else if (k in metrics.venue) {
    (metrics.venue as any)[k] += n;
  }
};

export const snapshotTelemetry = () => ({ 
  pattern: { ...metrics.pattern },
  venue: { ...metrics.venue }
});