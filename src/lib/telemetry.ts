// Global telemetry functions for production monitoring

// Development logging helper - silent in production
const devLog = (...a: unknown[]) => { 
  if (import.meta.env.DEV) console.log(...a); 
};

// Debounced GA sender to prevent spam
const lastSent = new Map<string, number>();
function sendGA(name: string, params: Record<string, unknown>, ttl = 30_000) {
  const now = Date.now();
  const key = `${name}:${JSON.stringify(params)}`;
  if ((lastSent.get(key) ?? 0) + ttl > now) return;
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, params);
  }
  lastSent.set(key, now);
}

export const telemetry = {
  pingFriendsRequest: async (profileId: string, recipientCount: number) => {
    // Hash profile ID for privacy compliance
    let profileHash = 'anon';
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(profileId));
      profileHash = Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {}
    
    sendGA('ping_friends_request', { profile_hash: profileHash, recipient_count: recipientCount });
    devLog('[Telemetry] ping_friends_request', { profileHash, recipientCount });
  },

  pushDeliverAttempt: (expo: number, fcm: number, apns: number, failures: number) => {
    sendGA('push_deliver_attempt', { expo_count: expo, fcm_count: fcm, apns_count: apns, failure_count: failures });
    devLog('[Telemetry] push_deliver_attempt', { expo, fcm, apns, failures });
  },

  convergenceOpenFromNotification: (etaMin: number, prob: number, success: boolean) => {
    sendGA('convergence_open_from_notification', { eta_min: etaMin, probability: prob, success });
    devLog('[Telemetry] convergence_open_from_notification', { etaMin, prob, success });
  },
};

// Aura system metrics - protected from external mutation
const _aura = {
  mounts: 0,
  unmounts: 0,
  reapplies: 0,          // style reload / setStyle re-mounts
  updates: 0,            // updates actually applied to the layer
  throttled: 0,          // update skipped due to gating/throttle
  watchStarts: 0,
  watchStops: 0,
  permissionDenied: 0,
  // Movement quality metrics
  movedMTotal: 0,        // total meters moved
  movedMBig: 0,          // moves >= 50m
  confDeltaTotal: 0,     // total confidence change
  confDeltaBig: 0,       // confidence changes >= 0.2
};

export const metrics = Object.freeze({ aura: _aura });

// Aura telemetry helpers
export const incrAura = (k: keyof typeof _aura, n = 1) => {
  _aura[k] += n;
};

export const snapshotAura = () => ({ ..._aura });

export const resetAura = () => {
  Object.keys(_aura).forEach(k => ((_aura as any)[k] = 0));
};

// Expose tiny helpers in DEV
if (import.meta?.env?.DEV && typeof window !== 'undefined') {
  (window as any).__aura = {
    snapshot: () => snapshotAura(),
    reset: () => resetAura(),
    log: () => console.table(snapshotAura()),
  };
}