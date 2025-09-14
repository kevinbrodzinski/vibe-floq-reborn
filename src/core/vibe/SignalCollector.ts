import * as React from 'react';
import type { EngineInputs, WeatherSignal } from './types';
import { MovementFromLocationTracker } from './collectors/MovementFromLocation';
import { DwellTracker } from './collectors/DwellTracker';
import { DeviceUsageTracker } from './collectors/DeviceUsage';
import { VenueClassifier } from './collectors/VenueClassifier';
import { getWeatherSignal } from './collectors/WeatherCollector';
import { EnhancedVenueIntelligence } from './collectors/EnhancedVenueIntelligence';
import haversine from 'haversine-distance';

type LngLat = { lat: number; lng: number } | null;

export function useSignalCollector() {
  const move = React.useRef(new MovementFromLocationTracker());
  const dwell = React.useRef(new DwellTracker());
  const device = React.useRef(new DeviceUsageTracker());
  const venue = React.useRef(new VenueClassifier());
  const enhancedVenue = React.useRef(new EnhancedVenueIntelligence());

  const coordsRef = React.useRef<LngLat>(null);
  const arrivedRef = React.useRef(false);

  // Geolocation (battery-light)
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
    let id = -1;
    try {
      id = navigator.geolocation.watchPosition(
        (pos) => { coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {},
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
      );
    } catch {}
    return () => { try { if (id !== -1) navigator.geolocation.clearWatch(id); } catch {} };
  }, []);

  React.useEffect(() => () => device.current.dispose(), []);


  const collect = React.useCallback((): EngineInputs => {
    const now = new Date();
    const hour = now.getHours();
    const isWeekend = [0, 6].includes(now.getDay());

    const coords = coordsRef.current ?? undefined;
    const m = move.current.update(coords || undefined);
    dwell.current.update(m.moving01);
    const dwellMin = Number(dwell.current.dwellMinutes().toFixed(2));

    // one-shot arrival edge
    const justArrived = dwell.current.arrived() && !arrivedRef.current;
    arrivedRef.current = dwell.current.arrived();

    // foreground ratio since last tick
    const screenOnRatio01 = device.current.pullRatio();

    // weather signal cached (async)
    const wxRef = (collect as any)._wxRef || ((collect as any)._wxRef = { s: undefined as WeatherSignal | undefined });
    if ((collect as any)._lastWxT == null || Date.now() - (collect as any)._lastWxT > 30 * 60_000) {
      (collect as any)._lastWxT = Date.now();
      getWeatherSignal(coords?.lat, coords?.lng)
        .then(wx => (wxRef.s = wx))
        .catch(() => {});
    }

    // Enhanced venue intelligence with movement threshold (consistent 250m grid)
    const venueRef = (collect as any)._venue || ((collect as any)._venue = { 
      base: null as number | null, 
      type: null as string | null,
      intelligence: null as any
    });
    const lastRef = (collect as any)._venueRef || ((collect as any)._venueRef = { t: 0, p: undefined as LngLat | undefined });
    
    const VENUE_REFRESH_M = 250; // Consistent with 250m grid
    const VENUE_REFRESH_MS = 5 * 60 * 1000;
    
    const moved = lastRef.p && coords 
      ? haversine(lastRef.p, coords) > VENUE_REFRESH_M 
      : true;
    const stale = Date.now() - lastRef.t > VENUE_REFRESH_MS;
    
    if ((moved || stale) && coords) {
      lastRef.t = Date.now(); 
      lastRef.p = coords;
      
      // Get both basic and enhanced venue data
      venue.current.classify(coords).then(v => { 
        if (v) { 
          venueRef.base = v.energy; 
          venueRef.type = v.type; 
        } 
      }).catch(() => {});
      
      // Get enhanced venue intelligence (parallel)
      enhancedVenue.current.getVenueIntelligence(coords).then(intelligence => {
        if (intelligence) {
          venueRef.intelligence = intelligence;
          // Update base energy from enhanced data if available (use as floor)
          venueRef.base = Math.max(venueRef.base || 0, intelligence.vibeProfile.energyLevel);
        }
      }).catch(() => {});
    }

    const wx = wxRef.s;
    return {
      hour,
      isWeekend,
      speedMps: m.speedMps,
      dwellMinutes: dwellMin,
      screenOnRatio01,
      // weather → engine inputs (all optional)
      isDaylight: wx?.isDaylight,
      weatherEnergyOffset: wx?.energyOffset,
      weatherConfidenceBoost: wx?.confidenceBoost,
      // venue (enhanced)
      venueArrived: justArrived,
      venueType: venueRef.type,
      venueEnergyBase: venueRef.base,
      venueIntelligence: venueRef.intelligence,
    };
  }, []);

  return { collect };
}