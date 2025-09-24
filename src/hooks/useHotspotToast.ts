import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useHotspots } from './useHotspots'
import { useUnifiedLocation } from './location/useUnifiedLocation'
import { useCurrentVibe } from '@/lib/store/useVibe'
import { getEnvironmentConfig } from '@/lib/environment'
import { storage } from '@/lib/storage'
import { calculateDistance } from '@/lib/location/standardGeo'

const TOAST_DISMISS_KEY = 'hotspot_toast_dismissed'
const DISMISS_DURATION = 90 * 60 * 1000 // 90 minutes in milliseconds
const PROXIMITY_THRESHOLD = 300 // 300 meters

async function isDismissedRecently(): Promise<boolean> {
  const dismissedTime = await storage.getItem(TOAST_DISMISS_KEY);
  if (!dismissedTime) return false;
  
  const timeDiff = Date.now() - parseInt(dismissedTime, 10);
  return timeDiff < DISMISS_DURATION;
}

function markAsDismissed(): void {
  storage.setItem(TOAST_DISMISS_KEY, Date.now().toString()).catch(console.error);
}

export const useHotspotToast = () => {
  const { hotspots } = useHotspots()
  const { coords } = useUnifiedLocation({
    enableTracking: false,
    enablePresence: false,
    hookId: 'hotspot-toast'
  })
  // Compatibility - convert coords to location format
  const location = coords ? { coords: { latitude: coords.lat, longitude: coords.lng } } : null
  const currentVibe = useCurrentVibe()
  const env = getEnvironmentConfig()
  const lastToastRef = useRef<string | null>(null)

  useEffect(() => {
    if (!env.hotSpotHalos || !hotspots.length || !location || !currentVibe) {
      return
    }

    // Don't show toast if recently dismissed  
    isDismissedRecently().then(dismissed => {
      if (dismissed) return;

      // Find nearest hotspot
      const userLat = location.coords.latitude
      const userLng = location.coords.longitude
      
      let nearestHotspot = null
      let nearestDistance = Infinity

      for (const hotspot of hotspots) {
        const [hotspotLng, hotspotLat] = hotspot.centroid.coordinates
        const distance = calculateDistance(
          { lat: userLat, lng: userLng },
          { lat: hotspotLat, lng: hotspotLng }
        )
        
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestHotspot = hotspot
        }
      }

      // Show toast if within proximity threshold
      if (nearestHotspot && nearestDistance <= PROXIMITY_THRESHOLD) {
        const distanceM = Math.round(nearestDistance)
        const toastId = `${nearestHotspot.gh6}-${nearestHotspot.delta}`
        
        // Avoid duplicate toasts
        if (lastToastRef.current === toastId) {
          return
        }
        
        lastToastRef.current = toastId

        const peopleCount = nearestHotspot.user_cnt || nearestHotspot.total_now || 0
        const vibeText = nearestHotspot.dom_vibe
        const deltaText = nearestHotspot.delta

        toast(`🔥 ${peopleCount} people vibing ${vibeText}`, {
          description: `${distanceM}m away • +${deltaText} in 5min • tap to open map`,
          action: {
            label: 'Open Map',
            onClick: () => {
              // Navigate to field view - this would need to be implemented based on your routing
              window.location.hash = '#/field'
              markAsDismissed()
            }
          },
          duration: 8000,
          onDismiss: () => {
            markAsDismissed()
          }
        })

        if (import.meta.env.DEV) {
          console.log(`[useHotspotToast] Showing toast for hotspot at ${distanceM}m: ${peopleCount} people, +${deltaText} surge`)
        }
      }
    }).catch(console.error);
  }, [hotspots, location, currentVibe, env.hotSpotHalos])
}