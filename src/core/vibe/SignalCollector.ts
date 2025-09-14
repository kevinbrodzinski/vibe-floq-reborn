import * as React from 'react';
import type { EngineInputs } from './types';
import { MovementFromLocationTracker } from './collectors/MovementFromLocation';
import { DwellTracker } from './collectors/DwellTracker';
import { DeviceUsageTracker } from './collectors/DeviceUsage';
import { getWeatherSignal } from './collectors/WeatherCollector';

type Coords = { lat: number; lng: number } | null;

export function useSignalCollector() {
  const move = React.useRef(new MovementFromLocationTracker());
  const dwell = React.useRef(new DwellTracker());
  const device = React.useRef(new DeviceUsageTracker());
  const coordsRef = React.useRef<Coords>(null);

  // Geolocation watch (battery-light, SSR-safe)
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
    let watchId = -1;
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
      );
    } catch {}
    return () => {
      try { if (watchId !== -1) navigator.geolocation.clearWatch(watchId); } catch {}
    };
  }, []);

  React.useEffect(() => {
    return () => device.current.dispose();
  }, []);

  const collect = React.useCallback((): EngineInputs => {
    const now = new Date();
    const hour = now.getHours();
    const isWeekend = [0, 6].includes(now.getDay());

    const coords = coordsRef.current ?? undefined;
    const m = move.current.update(coords || undefined);
    dwell.current.update(m.moving01);

    // Weather: use cached stub (async fetch avoided here)
    // We keep the last daylight flag in a ref to stay sync/non-blocking.
    const daylightRef = (collect as any)._daylightRef || ((collect as any)._daylightRef = { v: undefined as boolean | undefined });
    // Opportunistic refresh (non-blocking)
    if ((collect as any)._lastWxT == null || Date.now() - (collect as any)._lastWxT > 10 * 60 * 1000) {
      (collect as any)._lastWxT = Date.now();
      getWeatherSignal(coords?.lat, coords?.lng).then((wx) => (daylightRef.v = wx.isDaylight)).catch(() => {});
    }

    // NEW: screen-on ratio since last collect
    const screenOnRatio01 = device.current.pullRatio();

    return {
      hour,
      isWeekend,
      speedMps: m.speedMps,
      dwellMinutes: Number(dwell.current.dwellMinutes().toFixed(2)),
      screenOnRatio01,
      isDaylight: daylightRef.v,
      tempC: undefined,
      venueArrived: dwell.current.arrived(),
    };
  }, []);

  return { collect };
}