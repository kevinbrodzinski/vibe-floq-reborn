import { useState, useRef, useEffect } from 'react'
import { useGeo } from './useGeo'
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

// Location tracking hook with live sharing capabilities built on useGeo
export function useUserLocation() {
  const geo = useGeo({ watch: true }); // Use enhanced useGeo as foundation
  const bufferRef = useRef<LocationPing[]>([])
  const flushIntervalRef = useRef<number | null>(null)
  const lastPresenceBroadcast = useRef<number>(0)
  const userRef = useRef<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Get list of friends who can see our location
  const shareTo = useLiveShareFriends()

  // Get live settings for enhanced controls
  const { data: liveSettings } = useLiveSettings()

  // Context detection for smart sharing rules
  const { detectContext } = useContextDetection()

  // Convert geo coords to legacy location format
  const location = geo.coords ? {
    coords: {
      latitude: geo.coords.lat,
      longitude: geo.coords.lng,
      accuracy: geo.accuracy || 0,
    },
    geohash: ''
  } : null

  // Simplified pos interface for the FieldCanvas
  const pos = geo.coords ? {
    lat: geo.coords.lat,
    lng: geo.coords.lng,
    accuracy: geo.accuracy || 0,
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

  // Enhanced start tracking that sets up live sharing
  const startTracking = async () => {
    console.log('[useUserLocation] Starting enhanced location tracking...')
    
    try {
      // Get user ID and setup presence channel for live sharing
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('[useUserLocation] Not authenticated')
        return
      }
      userRef.current = user.id

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

      // Start base geolocation tracking
      geo.requestLocation()

      // Flush buffer every 15 seconds
      flushIntervalRef.current = setInterval(flushBuffer, 15_000)

    } catch (err: any) {
      console.error('[useUserLocation] Start tracking error:', err)
    }
  }

  const stopTracking = () => {
    // Stop base geo tracking
    geo.clearWatch()

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
  }

  // Handle live sharing when location updates
  useEffect(() => {
    if (!geo.coords || !userRef.current || !channelRef.current) return

    const now = Date.now()
    const { lat, lng } = geo.coords
    const acc = geo.accuracy || 0

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
  }, [geo.coords, geo.accuracy, shareTo, liveSettings, detectContext])

  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [])

  // Legacy interface compatibility
  const checkPermission = async () => {
    return geo.hasPermission || false
  }

  const resetLocation = () => {
    console.log('[useUserLocation] Resetting location state...')
    stopTracking()
  }

  // Return interface compatible with existing code
  return {
    location,
    isTracking: geo.status === 'success' || geo.status === 'loading',
    loading: geo.status === 'loading',
    error: geo.error || null,
    hasPermission: geo.hasPermission || false,
    pos,
    startTracking,
    stopTracking,
    setLocation: () => {}, // No-op for compatibility
    checkPermission,
    resetLocation
  }
}