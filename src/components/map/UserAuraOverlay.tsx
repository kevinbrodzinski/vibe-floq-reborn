// User location aura overlay component
// Integrates with LayerManager and useVibeEngine for theme-aware location display

import React, { useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import { createUserAuraSpec, type AuraData } from '@/lib/map/overlays/userAuraSpec';
import { useVibeEngine } from '@/hooks/useVibeEngine';
import { safeVibe } from '@/lib/vibes';
import { vibeToHex } from '@/lib/vibe/color';
import { calculateDistance as calculateDistanceMeters } from '@/lib/location/standardGeo';
import { useUserLocation } from '@/hooks/useUserLocation';
import { incrAura } from '@/lib/telemetry';
import type { LayerManager } from '@/lib/map/LayerManager';

type Props = {
  map: mapboxgl.Map | null;
  layerManager: LayerManager | null;
  beforeId?: string;               // layer insert anchor (e.g., 'venues')
  position?: { lat: number; lng: number } | null;  // optional external position
  enabled?: boolean;
};

const MIN_MOVE_M = 80;             // movement gate
const MIN_DELTA_CONF = 0.03;       // avoid tiny confidence changes
const TICK_MS = 500;               // throttle updates

export function UserAuraOverlay({ 
  map, 
  layerManager, 
  beforeId = 'venues', 
  position, 
  enabled = true 
}: Props) {
  const eng = useVibeEngine();
  const userLocation = useUserLocation({
    minMoveM: MIN_MOVE_M,
    minIntervalMs: 10_000,
    highAccuracy: false
  });

  // Use external position if provided, otherwise use location hook
  const pos = position ?? (userLocation.lat && userLocation.lng ? {
    lat: userLocation.lat,
    lng: userLocation.lng
  } : null);

  const lastRef = useRef<{ lat: number; lng: number; conf: number } | null>(null);
  const rafRef = useRef(0);
  const tRef = useRef<number | null>(null);

  // Register overlay spec with LayerManager
  React.useEffect(() => {
    if (!map || !layerManager || !enabled) return;

    const spec = createUserAuraSpec(beforeId);
    layerManager.register(spec);
    incrAura('mounts');

    // Style reload resilience
    const reapply = () => {
      if (!map.isStyleLoaded()) { 
        map.once('idle', reapply); 
        return; 
      }
      spec.mount(map);
      incrAura('reapplies');
      // update will run on next tick when data arrives
    };
    
    map.on('styledata', reapply);
    map.on('load', reapply);

    return () => {
      map.off('styledata', reapply);
      map.off('load', reapply);
      layerManager.unregister('user-aura');
      incrAura('unmounts');
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (tRef.current) { 
        clearTimeout(tRef.current); 
        tRef.current = null; 
      }
    };
  }, [map, layerManager, enabled, beforeId]);

  // Throttled updates when position or vibe changes
  React.useEffect(() => {
    if (!map || !layerManager || !enabled || !pos) return;

    // Don't render if permission explicitly denied
    if (userLocation.permission === 'denied') return;

    // Read current vibe and confidence
    const vibe = safeVibe(eng?.currentVibe ?? 'chill');
    const colorHex = vibeToHex(vibe);
    const conf = Math.max(0, Math.min(1, eng?.confidence ?? 0.5));

    const last = lastRef.current;
    const movedEnough = !last || calculateDistanceMeters(last, pos) > MIN_MOVE_M;
    const confChanged = !last || Math.abs(conf - last.conf) > MIN_DELTA_CONF;

    // Throttle updates to avoid spamming on noisy GPS
    const schedule = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (tRef.current) clearTimeout(tRef.current);
      
      tRef.current = window.setTimeout(() => {
        rafRef.current = requestAnimationFrame(() => {
          const data: AuraData = { 
            lng: pos.lng, 
            lat: pos.lat, 
            colorHex, 
            confidence01: conf 
          };
          layerManager.apply('user-aura', data);
          
          // Track movement quality metrics
          if (last) {
            const movedM = calculateDistanceMeters(last, pos);
            const confDelta = Math.abs(conf - last.conf);
            incrAura('movedMTotal', movedM);
            if (movedM >= 50) incrAura('movedMBig');
            incrAura('confDeltaTotal', confDelta);
            if (confDelta >= 0.2) incrAura('confDeltaBig');
          }
          
          lastRef.current = { ...pos, conf };
          incrAura('updates');
        });
      }, TICK_MS);
    };

    if (movedEnough || confChanged) {
      schedule();
    } else {
      incrAura('throttled');
    }
  }, [map, layerManager, enabled, pos, eng?.currentVibe, eng?.confidence, userLocation.permission]);

  return null;
}