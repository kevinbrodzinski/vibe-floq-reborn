import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useLiveShareFriends } from '@/hooks/useLiveShareFriends'
import { useLiveSettings } from '@/hooks/useLiveSettings'
import dayjs from '@/lib/dayjs'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { metersBetween } from '@/lib/location/geo'

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface LocationData {
  coords: LocationCoords;
  geohash: string;
}

interface LocationPing {
  ts: string
  lat: number
  lng: number
  acc?: number
}

// Location tracking hook with throttling and batching
export function useUserLocation() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const bufferRef = useRef<LocationPing[]>([])
  const watchIdRef = useRef<number | null>(null)
  const flushIntervalRef = useRef<number | null>(null)
  const lastPresenceBroadcast = useRef<number>(0)
  const userRef = useRef<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastCtxCheck = useRef<number>(0)
  const cachedCtx = useRef<{ inFloq: boolean; atVenue: boolean }>({ inFloq: false, atVenue: false })
  const floqPromiseRef = useRef<Promise<any> | null>(null)
  const venuePromiseRef = useRef<Promise<any> | null>(null)
  const retryRef = useRef(0)          // back-off counter
  const triesRef = useRef(0)          // accuracy level counter
  const retried = useRef(false)

  // Get list of friends who can see our location
  const shareTo = useLiveShareFriends()

  // Get live settings for enhanced controls
  const { data: liveSettings } = useLiveSettings()

  // Also provide the simplified pos interface for the FieldCanvas
  const pos = location ? {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy,
  } : null

  const flushBuffer = async () => {
    if (bufferRef.current.length === 0) return

    try {
      // Use cached user ID if available
      if (!userRef.current) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        userRef.current = user.id
      }

      const batch = bufferRef.current.splice(0, bufferRef.current.length)

      const { error } = await supabase.functions.invoke('record_locations', {
        body: { batch }  // ✅ No user_id - edge function gets it from JWT
      })

      if (error) {
        console.error('Failed to record locations:', error)
      }
    } catch (err) {
      console.error('Location flush error:', err)
    }
  }

  /** Returns a *coarse* fix or null in ≤7 s. */
  const getCoarseFix = (): Promise<GeolocationPosition | null> => {
    return new Promise(res => {
      navigator.geolocation.getCurrentPosition(
        p => res(p),              // may be 1–3 km accurate – good enough to start
        _ => res(null),           // ignore error -> null
        { enableHighAccuracy: false, timeout: 7_000, maximumAge: 60_000 }
      );
    });
  }

  // Adaptive geo options based on retry count
  const getGeoOptions = (): PositionOptions => {
    return {
      enableHighAccuracy: false,   // faster first fix, less battery
      timeout: 40_000,             // give Core-Location more time
      maximumAge: 15_000           // reuse recent fix if we have one
    }
  }

  const startTracking = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get user ID once at startup
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }
      userRef.current = user.id

      // Create and cache the presence channel
      if (!channelRef.current) {
        channelRef.current = supabase
          .channel(`presence_${user.id}`)
          .on('broadcast', { event: 'error' }, () => console.error('[RT] channel error'))
          .on('broadcast', { event: 'close' }, () => console.warn('[RT] channel closed'))
          .subscribe(status => {
            if (status === 'SUBSCRIBED') console.debug('[RT] presence channel ready')
          })
      }

      const permission = await navigator.permissions?.query({ name: 'geolocation' })
      if (permission?.state === 'denied') {
        setError('Location permission denied')
        setLoading(false)
        return
      }

      // --- priming ---------------------------------------------------
      console.log('[GEO] Requesting initial coarse position...')
      const coarse = await getCoarseFix();
      if (coarse) {
        setLocation({
          coords: {
            latitude: coarse.coords.latitude,
            longitude: coarse.coords.longitude,
            accuracy: coarse.coords.accuracy,
          },
          geohash: ''
        });
        console.log('[GEO] Got coarse fix:', coarse.coords.latitude, coarse.coords.longitude);
      }
      // ---------------------------------------------------------------

      // Start the long-running watchPosition with adaptive options
      console.log('[GEO] Starting watchPosition with accuracy level:', triesRef.current)

      const onPos = (position: GeolocationPosition) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = position.coords
        const now = Date.now()

        // Reset retry counter on success
        retryRef.current = 0
        triesRef.current = 0

        // Update location state for UI
        const locationData = {
          coords: {
            latitude: lat,
            longitude: lng,
            accuracy: acc,
          },
          geohash: '' // Can add geohash if needed
        }
        setLocation(locationData)

        const newPing: LocationPing = {
          ts: new Date().toISOString(),
          lat,
          lng,
          acc
        }

        // ---- distance gate 10 m + 20 s ----
        const lastPing = bufferRef.current.at(-1)
        if (lastPing) {
          const dt = now - new Date(lastPing.ts).valueOf();
          const dist = metersBetween(lat, lng, lastPing.lat, lastPing.lng);

          if (dist < 10 && dt < 20_000) return;   // skip jitter
        }

        bufferRef.current.push(newPing)

        // Presence broadcast (throttled to every 10 seconds)
        if (now - lastPresenceBroadcast.current > 10000) {
          const broadcastPresence = async () => {
            try {
              if (!userRef.current || !channelRef.current) return

              /* 1. who is allowed to see me? */
              if (!shareTo.length) return; // nothing to do

              /* 2. check ghost mode (live_muted_until) */
              if (liveSettings?.live_muted_until && dayjs(liveSettings.live_muted_until).isAfter(dayjs())) {
                return; // ghost mode active
              }

              /* 3. check live scope */
              if (liveSettings?.live_scope === 'none') {
                return; // user chose "nobody"
              }

              /* 4. check auto-sharing rules */
              const allowed = liveSettings?.live_auto_when ?? ['always'];

              /* ---------- smart context detection ------------------ */
              let insideFloq = false;
              let atVenue = false;
              let walking = false;

              // throttle expensive context checks
              if (now - lastCtxCheck.current > 60_000) {
                lastCtxCheck.current = now

                // --- A. in-Floq (debounced)
                if (allowed.includes('in_floq')) {
                  if (!floqPromiseRef.current) {
                    floqPromiseRef.current = Promise.resolve(supabase.rpc(
                      'get_visible_floqs_with_members' as any,
                      { p_user_lat: lat, p_user_lng: lng, p_limit: 50, p_offset: 0 }
                    ));
                  }
                  const { data: floqs } = await floqPromiseRef.current;
                  floqPromiseRef.current = null;
                  cachedCtx.current.inFloq = (floqs ?? []).some((f: any) =>
                    f.distance_meters != null && f.distance_meters < 50)
                }

                // --- B. at-venue (debounced)
                if (allowed.includes('at_venue')) {
                  if (!venuePromiseRef.current) {
                    venuePromiseRef.current = Promise.resolve(supabase
                      .rpc('get_nearby_venues' as any, { p_lat: lat, p_lng: lng, p_radius: 30, p_limit: 1 }));
                  }
                  const { data: venues } = await venuePromiseRef.current;
                  venuePromiseRef.current = null;
                  cachedCtx.current.atVenue = !!(venues && venues.length)
                }
              }

              insideFloq = cachedCtx.current.inFloq
              atVenue = cachedCtx.current.atVenue

              /*  C. walking speed 0.7-2.5 m/s  (~2-9 km/h) */
              if (allowed.includes('walking') && bufferRef.current.length > 1) {
                const prev = bufferRef.current.at(-2)!;
                const dist = metersBetween(lat, lng, prev.lat, prev.lng);
                const v = dist / ((now - new Date(prev.ts).valueOf()) / 1000);  // m/s
                walking = v >= 0.7 && v <= 2.5;
              }

              const ruleOK =
                allowed.includes('always') ||
                (insideFloq && allowed.includes('in_floq')) ||
                (atVenue && allowed.includes('at_venue')) ||
                (walking && allowed.includes('walking'));

              if (!ruleOK) {
                return; // conditions not met
              }

              /* 5. throttle and broadcast */
              lastPresenceBroadcast.current = now;

              // Use the cached channel
              channelRef.current?.send({
                type: 'broadcast',
                event: 'live_pos',
                payload: { lat, lng, acc, ts: now }
              });
            } catch (error) {
              console.error('Error broadcasting presence:', error)
            }
          }
          broadcastPresence()
        }
      }

      const onErr = (err: GeolocationPositionError) => {
        console.error('Geolocation error:', err)
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          if (!retried.current) {
            retried.current = true
            console.warn('[GEO] CoreLocation error, retrying with relaxed settings');
            if (watchIdRef.current) {
              navigator.geolocation.clearWatch(watchIdRef.current);
            }
            watchIdRef.current = navigator.geolocation.watchPosition(
              onPos,
              onErr,
              {
                enableHighAccuracy: false,   // fall-back
                timeout: 60_000,
                maximumAge: 30_000
              }
            )
            return                 // give CoreLocation another chance
          }
        }
        // PERMISSION_DENIED etc…
        setError('denied');
        setLoading(false)
        setIsTracking(false)
      }

      watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, getGeoOptions())

      // Flush buffer every 15 seconds
      flushIntervalRef.current = setInterval(flushBuffer, 15_000)

      // Set tracking state immediately after watchPosition succeeds
      setIsTracking(true)
      setLoading(false)
      setError(null)

    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current)
      flushIntervalRef.current = null
    }

    // Clean up the presence channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Final flush
    flushBuffer()
    bufferRef.current = []   // clear AFTER flushing

    setIsTracking(false)
    setLoading(false)
    setError(null)
  }

  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [])

  return {
    location,
    isTracking,
    loading,
    error,
    pos,
    startTracking,
    stopTracking,
    setLocation
  }
}