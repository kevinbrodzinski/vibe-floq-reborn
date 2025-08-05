
import { useState } from 'react'
import { X, MapPin, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { zIndex } from '@/constants/z'

interface SmartSuggestion {
  cluster_id: string
  top_vibes: Array<{ vibe: string; count: number; score: number }>
  is_hot: boolean
  people_estimate: number
  distance_meters: number
  relevance_score: number
}

interface SmartSuggestionBannerProps {
  suggestion: SmartSuggestion
  onApply: (vibe: string, clusterId: string) => void
  onDismiss: (clusterId: string) => void
}

export const SmartSuggestionBanner: React.FC<SmartSuggestionBannerProps> = ({
  suggestion,
  onApply,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const topVibe = suggestion.top_vibes[0]

  if (!isVisible || !topVibe) return null

  const handleApply = () => {
    onApply(topVibe.vibe, suggestion.cluster_id)
    setIsVisible(false)
  }

  const handleDismiss = () => {
    onDismiss(suggestion.cluster_id)
    setIsVisible(false)
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  return (
    <div {...zIndex('toast')} className="fixed bottom-24 left-1/2 transform -translate-x-1/2 max-w-sm mx-auto animate-slideUp">
      <div className="bg-card/95 backdrop-blur-sm border border-border shadow-lg rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {suggestion.is_hot ? (
              <Zap className="h-5 w-5 text-primary" />
            ) : (
              <MapPin className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm text-foreground">
              {suggestion.is_hot && (
                <span className="inline-flex items-center gap-1 text-primary font-medium">
                  🔥 Hot spot!
                </span>
              )}
              <p className="mt-1">
                <span className="font-medium capitalize">{topVibe.vibe}</span> vibes with{' '}
                <span className="font-medium">{suggestion.people_estimate} people</span>{' '}
                <span className="text-muted-foreground">
                  {formatDistance(suggestion.distance_meters)} away
                </span>
              </p>
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleApply}
                className="flex-1 text-xs"
              >
                Switch to {topVibe.vibe}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
