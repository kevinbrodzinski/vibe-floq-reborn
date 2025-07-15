import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useHotspots } from './useHotspots'
import { useUserLocation } from './useUserLocation'
import { useCurrentVibe } from '@/lib/store/useVibe'
import { getEnvironmentConfig } from '@/lib/environment'

// Haversine distance calculation
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const TOAST_DISMISS_KEY = 'hotspot_toast_dismissed'
const DISMISS_DURATION = 90 * 60 * 1000 // 90 minutes in milliseconds
const PROXIMITY_THRESHOLD = 300 // 300 meters

function isDismissedRecently(): boolean {
  const dismissedTime = localStorage.getItem(TOAST_DISMISS_KEY)
  if (!dismissedTime) return false
  
  const timeDiff = Date.now() - parseInt(dismissedTime, 10)
  return timeDiff < DISMISS_DURATION
}

function markAsDismissed(): void {
  localStorage.setItem(TOAST_DISMISS_KEY, Date.now().toString())
}

export const useHotspotToast = () => {
  const { hotspots } = useHotspots()
  const { location } = useUserLocation()
  const currentVibe = useCurrentVibe()
  const env = getEnvironmentConfig()
  const lastToastRef = useRef<string | null>(null)

  useEffect(() => {
    if (!env.hotSpotHalos || !hotspots.length || !location || !currentVibe) {
      return
    }

    // Don't show toast if recently dismissed
    if (isDismissedRecently()) {
      return
    }

    // Find nearest hotspot
    const userLat = location.coords.latitude
    const userLng = location.coords.longitude
    
    let nearestHotspot = null
    let nearestDistance = Infinity

    for (const hotspot of hotspots) {
      const [hotspotLng, hotspotLat] = hotspot.centroid.coordinates
      const distance = getDistance(userLat, userLng, hotspotLat, hotspotLng)
      
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
  }, [hotspots, location, currentVibe, env.hotSpotHalos])
}