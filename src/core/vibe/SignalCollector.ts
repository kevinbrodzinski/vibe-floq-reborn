import * as React from 'react';
import type { EngineInputs } from './types';
import { MovementFromLocationTracker } from './collectors/MovementFromLocation';
import { DwellTracker } from './collectors/DwellTracker';
import { DeviceUsageTracker } from './collectors/DeviceUsage';
import { VenueClassifier } from './collectors/VenueClassifier';
import { getWeatherSignal } from './collectors/WeatherCollector';
import haversine from 'haversine-distance';

type LngLat = { lat: number; lng: number } | null;

export function useSignalCollector() {
  const move = React.useRef(new MovementFromLocationTracker());
  const dwell = React.useRef(new DwellTracker());
  const device = React.useRef(new DeviceUsageTracker());
  const venue = React.useRef(new VenueClassifier());

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

    // daylight cached (async)
    const daylightRef = (collect as any)._dayRef || ((collect as any)._dayRef = { v: undefined as boolean | undefined });
    if ((collect as any)._lastWxT == null || Date.now() - (collect as any)._lastWxT > 10 * 60 * 1000) {
      (collect as any)._lastWxT = Date.now();
      getWeatherSignal(coords?.lat, coords?.lng).then(wx => (daylightRef.v = wx.isDaylight)).catch(() => {});
    }

    // Smart venue classification with movement threshold
    const venueRef = (collect as any)._venue || ((collect as any)._venue = { base: null as number | null, type: null as string | null });
    const lastRef = (collect as any)._venueRef || ((collect as any)._venueRef = { t: 0, p: undefined as LngLat | undefined });
    
    const VENUE_REFRESH_M = 120;
    const VENUE_REFRESH_MS = 5 * 60 * 1000;
    
    const moved = lastRef.p && coords 
      ? haversine(lastRef.p, coords) > VENUE_REFRESH_M 
      : true;
    const stale = Date.now() - lastRef.t > VENUE_REFRESH_MS;
    
    if ((moved || stale) && coords) {
      lastRef.t = Date.now(); 
      lastRef.p = coords;
      venue.current.classify(coords).then(v => { 
        if (v) { 
          venueRef.base = v.energy; 
          venueRef.type = v.type; 
        } 
      }).catch(() => {});
    }

    return {
      hour,
      isWeekend,
      speedMps: m.speedMps,
      dwellMinutes: dwellMin,
      screenOnRatio01,
      isDaylight: daylightRef.v,
      tempC: undefined,

      // new:
      venueArrived: justArrived,
      venueType: venueRef.type,
      venueEnergyBase: venueRef.base,
    };
  }, []);

  return { collect };
}