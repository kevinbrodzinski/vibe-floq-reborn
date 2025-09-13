import * as React from 'react';
import { layerManager } from '@/lib/map/LayerManager';
import { createPredictedMeetSpec, applyPredictedMeetFeatureCollection } from '@/lib/map/overlays/predictedMeetSpec';
import { eventBridge, Events } from '@/services/eventBridge';
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
  // Register spec once
  React.useEffect(() => {
    layerManager.register(createPredictedMeetSpec());
    return () => layerManager.unregister('predicted-meet');
  }, []);

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

  // Listen for convergence events and add points
  React.useEffect(() => {
    const unsubscribe = () => eventBridge.off(Events.FLOQ_CONVERGENCE_DETECTED, handler);
    const handler = (payload: any) => {
      if (!payload?.predictedLocation) return;
      const { lng, lat } = payload.predictedLocation;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      const key = buildSuppressionKey({
        friendId: payload.friendId,
        participants: payload.participants,
        lng, lat,
        timeToMeet: payload.timeToMeet,
      });
      if (shouldSuppress(key)) return;

      const etaSec = Number.isFinite(payload.timeToMeet) ? Math.max(5, Math.min(180, Math.floor(payload.timeToMeet))) : 60;
      const prob = Math.max(0, Math.min(1, payload.probability ?? 0.7));
      pushItem(lng, lat, etaSec, prob);
      render();
    };

    eventBridge.on(Events.FLOQ_CONVERGENCE_DETECTED, handler);

    // lightweight animation loop
    const id = setInterval(render, FPS_MS);
    render();

    return () => { unsubscribe(); clearInterval(id); };
  }, [pushItem, render]);

  return null;
}
