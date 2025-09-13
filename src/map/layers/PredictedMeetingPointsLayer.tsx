import * as React from 'react';
import { layerManager } from '@/lib/map/LayerManager';
import { createPredictedMeetSpec, applyPredictedMeetFeatureCollection } from '@/lib/map/overlays/predictedMeetSpec';
import { onEvent, Events } from '@/services/eventBridge';
import { shouldSuppress, buildSuppressionKey, prune } from '@/lib/predictedMeet/suppressStore';

// ring animation tuning
const PERIOD_MS = 1600;          // full pulse period
const MIN_RING_PX = 8;           // min ring radius (px)
const MAX_RING_PX = 28;          // max ring radius (px)
const FPS_MS = 160;              // ~6fps is plenty (low power)

type Item = {
  id: string;
  lng: number; lat: number;
  prob: number;
  createdAt: number;
  etaSec: number;     // seconds
  expiresAt: number;  // absolute ms
};

export function PredictedMeetingPointsLayer() {
  // Small persisted flag
  const LS_KEY = 'floq:layers:predicted-meet:enabled';
  const [enabled, setEnabled] = React.useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw == null ? true : raw === 'true';
    } catch { return true; }
  });

  // Register/unregister based on enabled
  React.useEffect(() => {
    if (!enabled) {
      try { layerManager.unregister('predicted-meet'); } catch {}
      return;
    }
    layerManager.register(createPredictedMeetSpec());
    return () => { try { layerManager.unregister('predicted-meet'); } catch {} };
  }, [enabled]);

  const itemsRef = React.useRef<Item[]>([]);

  const pushItem = React.useCallback((lng: number, lat: number, etaSec: number, prob: number) => {
    const now = Date.now();
    itemsRef.current.push({
      id: `pm-${now}-${Math.random().toString(36).slice(2)}`,
      lng, lat,
      prob,
      createdAt: now,
      etaSec,
      // keep a bit after ETA so user sees it
      expiresAt: now + Math.min(180_000, Math.max(15_000, (etaSec + 15) * 1000)),
    });
  }, []);

  const buildFC = React.useCallback(() => {
    // prune expired + store
    const now = Date.now();
    prune();
    itemsRef.current = itemsRef.current.filter(it => it.expiresAt > now);

    // Pulse progress [0..1]
    const features: any[] = [];
    for (const it of itemsRef.current) {
      // Anchor dot
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [it.lng, it.lat] as [number, number] },
        properties: { kind: 'dot', prob: it.prob },
      });

      // Ring: compute progress (wrap)
      const t = (now - it.createdAt) % PERIOD_MS;
      // ease-out radius
      const p = t / PERIOD_MS;              // 0..1
      // simple ease: accelerate fast then slow (quartic-ish)
      const ease = 1 - Math.pow(1 - p, 3);
      const r = MIN_RING_PX + (MAX_RING_PX - MIN_RING_PX) * ease;
      const o = Math.max(0, 0.7 * (1 - p)); // fades out

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [it.lng, it.lat] as [number, number] },
        properties: {
          kind: 'ring',
          r,  // ring radius in px
          o,  // ring opacity
        },
      });
    }

    return { type: 'FeatureCollection', features };
  }, []);

  const render = React.useCallback(() => {
    const fc = buildFC();
    applyPredictedMeetFeatureCollection(fc);
  }, [buildFC]);

  // Toggle handling
  React.useEffect(() => {
    const offToggle = onEvent(Events.FLOQ_LAYER_TOGGLE, (p) => {
      if (!p || p.id !== 'predicted-meet') return;
      setEnabled(prev => {
        const next = p.enabled == null ? !prev : !!p.enabled;
        try { localStorage.setItem(LS_KEY, String(next)); } catch {}
        return next;
      });
    });
    const offSet = onEvent(Events.FLOQ_LAYER_SET, (p) => {
      if (!p || p.id !== 'predicted-meet') return;
      setEnabled(!!p.enabled);
      try { localStorage.setItem(LS_KEY, String(!!p.enabled)); } catch {}
    });
    return () => { offToggle(); offSet(); };
  }, []);

  // Listen for convergence events and add points (only when enabled)
  React.useEffect(() => {
    if (!enabled) return;
    const off = onEvent(Events.FLOQ_CONVERGENCE_DETECTED, (payload) => {
      if (!payload?.predictedLocation) return;
      const { lng, lat } = payload.predictedLocation;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      const key = buildSuppressionKey({
        friendId: payload.friendId,
        participants: [payload.friendId], // Use friendId as participant for now
        lng, lat,
        timeToMeet: payload.timeToMeet,
      });
      if (shouldSuppress(key)) return;

      const etaSec = Number.isFinite(payload.timeToMeet) ? Math.max(5, Math.min(180, Math.floor(payload.timeToMeet))) : 60;
      const prob = Math.max(0, Math.min(1, payload.probability ?? 0.7));
      pushItem(lng, lat, etaSec, prob);
      render();
    });
    const id = setInterval(render, FPS_MS);
    render();
    return () => { off(); clearInterval(id); };
  }, [enabled, pushItem, render]);

  return null;
}
