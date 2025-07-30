import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useLiveShareFriends } from '@/hooks/useLiveShareFriends'
import { useLiveSettings } from '@/hooks/useLiveSettings'
import { useContextDetection } from '@/hooks/useContextDetection'
import dayjs from '@/lib/dayjs'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { metersBetween } from '@/lib/location/geo'
import { applyPrivacyFilter } from '@/lib/location/privacy'

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
  const [hasPermission, setHasPermission] = useState(false)
  const bufferRef = useRef<LocationPing[]>([])
  const watchIdRef = useRef<number | null>(null)
  const flushIntervalRef = useRef<number | null>(null)
  const lastPresenceBroadcast = useRef<number>(0)
  const userRef = useRef<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retryRef = useRef(0)          // back-off counter
  const triesRef = useRef(0)          // accuracy level counter
  const retried = useRef(false)

  // Get list of friends who can see our location
  const shareTo = useLiveShareFriends()

  // Get live settings for enhanced controls
  const { data: liveSettings } = useLiveSettings()

  // Context detection for smart sharing rules
  const { detectContext } = useContextDetection()

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

  /** Returns a *coarse* fix or null in ≤7 s. iOS-friendly settings. */
  const getCoarseFix = (): Promise<GeolocationPosition | null> => {
    const isCapacitor = !!(window as any).Capacitor
    const isIOS = isCapacitor && (window as any).Capacitor?.getPlatform?.() === 'ios'
    
    return new Promise(res => {
      navigator.geolocation.getCurrentPosition(
        p => res(p),              // may be 1–3 km accurate – good enough to start
        _ => res(null),           // ignore error -> null
        { 
          enableHighAccuracy: false, 
          timeout: isIOS ? 10_000 : 7_000, 
          maximumAge: isIOS ? 30_000 : 60_000 
        }
      );
    });
  }

  // iOS-friendly geo options with Capacitor detection
  const getGeoOptions = (): PositionOptions => {
    const isCapacitor = !!(window as any).Capacitor
    const isIOS = isCapacitor && (window as any).Capacitor?.getPlatform?.() === 'ios'
    
    return {
      enableHighAccuracy: false,   // faster first fix, less battery drain
      timeout: isIOS ? 20_000 : 40_000,  // iOS CoreLocation friendly timeout
      maximumAge: isIOS ? 10_000 : 15_000  // fresher fixes on iOS
    }
  }

  const startTracking = async () => {
    console.log('[useUserLocation] Starting location tracking...')
    
    if (!navigator.geolocation) {
      console.error('[useUserLocation] Geolocation not supported')
      setError('Geolocation not supported')
      return
    }

    // Remove conflict checking - let both hooks operate independently

    setLoading(true)
    setError(null)

    try {
      // Get user ID once at startup
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('[useUserLocation] Not authenticated')
        setError('Not authenticated')
        setLoading(false)
        return
      }
      userRef.current = user.id
      console.log('[useUserLocation] User authenticated:', user.id)

      // Create and cache the presence channel
      if (!channelRef.current) {
        console.log('[useUserLocation] Creating presence channel...')
        channelRef.current = supabase
          .channel(`presence_${user.id}`)
          .on('broadcast', { event: 'error' }, () => console.error('[RT] channel error'))
          .on('broadcast', { event: 'close' }, () => console.warn('[RT] channel closed'))
          .subscribe(status => {
            console.log('[useUserLocation] Channel status:', status)
            if (status === 'SUBSCRIBED') console.debug('[RT] presence channel ready')
          })
      }

      // Enhanced permission checking with better iOS Safari detection
      let hasPermission = false
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      
      console.log('[useUserLocation] Browser detection - iOS:', isIOS, 'Safari:', isSafari)

      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' })
          console.log('[useUserLocation] Permission state:', permission.state)
          
          if (permission.state === 'denied') {
            setError(isIOS && isSafari 
              ? 'Location blocked. Go to Settings > Safari > Location to enable.' 
              : 'Location permission denied. Please enable in browser settings.')
            setLoading(false)
            return
          }
          hasPermission = permission.state === 'granted'
        } catch (err) {
          console.warn('[useUserLocation] Permission query failed:', err)
          // Continue with manual permission check
        }
      }

      if (!hasPermission) {
        console.log('[useUserLocation] No explicit permission, will request via geolocation API')
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

               /* 5. apply coordinate snapping for privacy */
               const privacyFiltered = applyPrivacyFilter(lat, lng, acc, liveSettings);

              /* ---------- smart context detection ------------------ */
              const context = await detectContext(lat, lng, acc, allowed);

              const ruleOK =
                allowed.includes('always') ||
                (context.inFloq && allowed.includes('in_floq')) ||
                (context.atVenue && allowed.includes('at_venue')) ||
                (context.walking && allowed.includes('walking'));

              if (!ruleOK) {
                return; // conditions not met
              }

              /* 5. throttle and broadcast */
              lastPresenceBroadcast.current = now;

               // Use the cached channel with snapped coordinates and accuracy
               channelRef.current?.send({
                 type: 'broadcast',
                 event: 'live_pos',
                 payload: { 
                   lat: privacyFiltered.lat, 
                   lng: privacyFiltered.lng, 
                   acc: privacyFiltered.accuracy, 
                   ts: now 
                 }
               });
            } catch (error) {
              console.error('Error broadcasting presence:', error)
            }
          }
          broadcastPresence()
        }
      }

      const onErr = (err: GeolocationPositionError) => {
        console.error('[useUserLocation] Geolocation error:', err.code, err.message)
        
        if (err.code === err.PERMISSION_DENIED) {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
          
          if (isIOS && isSafari) {
            setError('Location access denied. Open Settings > Safari > Location Services and allow location access.')
          } else {
            setError('Location permission denied. Please enable location access in your browser settings and refresh the page.')
          }
          setLoading(false)
          setIsTracking(false)
          return
        }
        
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          if (!retried.current) {
            retried.current = true
            console.warn('[useUserLocation] GPS timeout/unavailable, retrying with relaxed settings')
            if (watchIdRef.current) {
              navigator.geolocation.clearWatch(watchIdRef.current)
            }
            watchIdRef.current = navigator.geolocation.watchPosition(
              onPos,
              onErr,
              {
                enableHighAccuracy: false,   // fall-back to network/wifi location
                timeout: 60_000,
                maximumAge: 60_000
              }
            )
            return
          } else {
            setError('GPS unavailable. Try moving to an area with better signal or enabling WiFi location.')
          }
        } else {
          setError(`Location error: ${err.message}`)
        }
        
        setLoading(false)
        setIsTracking(false)
      }

      // No global flag needed - proper cleanup on unmount is sufficient
      
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

    // Cleanup completed

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

  // Add permission check utility
  const checkPermission = async () => {
    if (!navigator.permissions) return false
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      const granted = permission.state === 'granted'
      setHasPermission(granted)
      return granted
    } catch {
      return false
    }
  }

  // Add reset utility for stuck states
  const resetLocation = () => {
    console.log('[useUserLocation] Resetting location state...')
    stopTracking()
    setError(null)
    setLoading(false)
    setLocation(null)
    setHasPermission(false)
    retryRef.current = 0
    triesRef.current = 0
    retried.current = false
  }

  return {
    location,
    isTracking,
    loading,
    error,
    hasPermission,
    pos,
    startTracking,
    stopTracking,
    setLocation,
    checkPermission,
    resetLocation
  }
}