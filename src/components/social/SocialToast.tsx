import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useSocialSuggestions } from '@/hooks/useSocialSuggestions'
import { usePageVisibility } from '@/hooks/usePageVisibility'

const PROXIMITY_THRESHOLD = 300 // metres
const MATCH_THRESHOLD = 0.7 // vibe match threshold

export const SocialToastProvider: React.FC = () => {
  const { suggestions } = useSocialSuggestions()
  const isOnMapView = usePageVisibility()
  const lastToastTime = useRef<number>(0)

  useEffect(() => {
    // Don't show toast if user is on map view
    if (isOnMapView) return
    
    // Find high-match nearby friends
    const nearbyHighMatch = suggestions.find(s => 
      s.vibe_match >= MATCH_THRESHOLD && 
      s.distance_m <= PROXIMITY_THRESHOLD
    )

    if (!nearbyHighMatch) return

    // Prevent spam - only show toast once every 5 minutes per friend
    const now = Date.now()
    if (now - lastToastTime.current < 5 * 60 * 1000) return
    
    lastToastTime.current = now

    toast(`🎉 ${nearbyHighMatch.display_name} is ${nearbyHighMatch.vibe_tag} nearby!`, {
      description: `${Math.round(nearbyHighMatch.distance_m)}m away • ${Math.round(nearbyHighMatch.vibe_match * 100)}% vibe match`,
      action: {
        label: 'Open Map',
        onClick: () => {
          window.location.hash = '#/field'
        },
      },
      duration: 8000,
    })
  }, [suggestions, isOnMapView])

  return null
}