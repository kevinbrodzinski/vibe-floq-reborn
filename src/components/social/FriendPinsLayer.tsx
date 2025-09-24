import { useMemo } from 'react'
import * as deckLayers from '@deck.gl/layers'
import { SocialSuggestion } from '@/hooks/useSocialSuggestions'

interface FriendPinsLayerProps {
  suggestions: SocialSuggestion[]
  onFriendClick?: (friendId: string) => void
}

export function useFriendPinsLayer(suggestions: SocialSuggestion[], onFriendClick?: (friendId: string) => void) {
  return useMemo(() => {
    if (!suggestions.length) return null

    const getVibeColor = (vibe: string): [number, number, number] => {
      switch (vibe) {
        case 'chill': return [76, 146, 255]
        case 'flowing': return [0, 194, 209]
        case 'hype': return [175, 82, 222]
        case 'social': return [34, 197, 94]
        case 'romantic': return [236, 72, 153]
        default: return [156, 163, 175]
      }
    }

    const ScatterplotLayer = (deckLayers as any).ScatterplotLayer
    
    return new (ScatterplotLayer as any)({
      id: 'friend-pins',
      data: suggestions,
      getPosition: (d: SocialSuggestion) => {
        // Assuming suggestions include lat/lng coordinates
        // You may need to adjust this based on your data structure
        return [(d as any).lng || 0, (d as any).lat || 0]
      },
      getRadius: (d: SocialSuggestion) => {
        // Pulse effect for high-match friends
        return d.vibe_match >= 0.7 ? 40 : 30
      },
      radiusUnits: 'pixels',
      getFillColor: (d: SocialSuggestion) => {
        const color = getVibeColor(d.vibe_tag)
        // Add transparency for lower matches
        const alpha = Math.max(100, d.vibe_match * 255)
        return [...color, alpha] as [number, number, number, number]
      },
      getLineColor: [255, 255, 255, 200],
      lineWidthMinPixels: 2,
      pickable: true,
      onClick: ({ object }) => {
        if (object && onFriendClick) {
          onFriendClick(object.friend_id)
        }
      },
      updateTriggers: { 
        data: suggestions,
        getRadius: suggestions.map(s => s.vibe_match),
        getFillColor: suggestions.map(s => s.vibe_tag)
      },
      // Add pulsing animation for high-match friends
      extensions: [],
      parameters: {
        depthTest: false
      }
    })
  }, [suggestions, onFriendClick])
}