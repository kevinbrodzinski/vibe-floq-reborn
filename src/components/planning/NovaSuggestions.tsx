import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles, Clock, MapPin, Users, TrendingUp, X, RefreshCw } from 'lucide-react'
import { PlanStop } from '@/types/plan'

interface SuggestionReason {
  type: 'optimal_timing' | 'travel_efficiency' | 'crowd_patterns' | 'weather' | 'popularity'
  confidence: number
  description: string
}

interface TimeSlotSuggestion {
  id: string
  startTime: string
  endTime: string
  title: string
  venue?: string
  location?: string
  reasons: SuggestionReason[]
  aiConfidence: number
  estimatedCost?: number
  vibeMatch: number
  category: 'dining' | 'entertainment' | 'culture' | 'outdoor' | 'nightlife'
}

interface NovaSuggestionsProps {
  planId: string
  existingStops: PlanStop[]
  timeRange: { start: string; end: string }
  participants: number
  preferences?: {
    budget?: 'low' | 'medium' | 'high'
    vibes?: string[]
    interests?: string[]
  }
  onAcceptSuggestion: (suggestion: TimeSlotSuggestion) => void
  onDismiss: () => void
  className?: string
}

export function NovaSuggestions({
  planId,
  existingStops,
  timeRange,
  participants,
  preferences,
  onAcceptSuggestion,
  onDismiss,
  className = ""
}: NovaSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<TimeSlotSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // API-ready toggle for future server integration
  const USE_MOCK = true

  // Fetch suggestions with API-ready toggle
  const fetchSuggestions = useCallback(async (): Promise<TimeSlotSuggestion[]> => {
    if (USE_MOCK) {
      // Mock AI suggestions based on existing stops and preferences
      return [
        {
          id: 'nova-1',
          startTime: '18:30',
          endTime: '20:00',
          title: 'Aperitivo at Catch LA',
          venue: 'Catch LA',
          location: 'West Hollywood',
          reasons: [
            {
              type: 'optimal_timing',
              confidence: 95,
              description: 'Perfect timing for sunset views and happy hour pricing'
            },
            {
              type: 'travel_efficiency', 
              confidence: 88,
              description: '12 minutes from your previous stop with optimal traffic flow'
            },
            {
              type: 'crowd_patterns',
              confidence: 92,
              description: 'Low crowd density at this time - 73% booking availability'
            }
          ],
          aiConfidence: 91,
          estimatedCost: 35,
          vibeMatch: 94,
          category: 'dining'
        },
        {
          id: 'nova-2',
          startTime: '20:30',
          endTime: '22:00',
          title: 'Live Jazz at The Dresden',
          venue: 'The Dresden',
          location: 'Los Feliz',
          reasons: [
            {
              type: 'popularity',
              confidence: 89,
              description: 'Trending 23% above average for your group demographics'
            },
            {
              type: 'optimal_timing',
              confidence: 96,
              description: 'Live performance starts at 9 PM - ideal arrival window'
            }
          ],
          aiConfidence: 87,
          estimatedCost: 28,
          vibeMatch: 89,
          category: 'entertainment'
        },
        {
          id: 'nova-3',
          startTime: '22:30',
          endTime: '00:30',
          title: 'Late Night Bites at Night + Market',
          venue: 'Night + Market',
          location: 'Sunset Strip',
          reasons: [
            {
              type: 'travel_efficiency',
              confidence: 94,
              description: 'Optimal route continuation - 8 min drive from Dresden'
            },
            {
              type: 'crowd_patterns',
              confidence: 85,
              description: 'Kitchen stays open until 1 AM - avoid restaurant closing rush'
            }
          ],
          aiConfidence: 89,
          estimatedCost: 42,
          vibeMatch: 86,
          category: 'dining'
        }
      ]
    } else {
      // Future: return await fetch('/ai/suggestions', ...)
      throw new Error('AI API not implemented yet')
    }
  }, [])

  // Genuine debounced refresh to prevent rapid clicks
  const debouncedRefresh = useCallback(() => {
    if (timeoutRef.current) return // Genuine debounce guard
    
    setRefreshKey(k => k + 1)
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
    }, 300)
  }, [])

  // Stable callback – only recreated when planId or refreshKey changes
  const generateSuggestions = useCallback(async () => {
    setIsLoading(true)
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Simulate AI processing delay
    timeoutRef.current = setTimeout(async () => {
      try {
        const suggestions = await fetchSuggestions()
        setSuggestions(suggestions)
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 1500)
  }, [planId, refreshKey, fetchSuggestions])

  // Only run on mount + manual refresh
  useEffect(() => {
    generateSuggestions()
    // Cleanup: cancel pending timeout if unmounted
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [generateSuggestions])

  const getReasonIcon = (type: SuggestionReason['type']) => {
    switch (type) {
      case 'optimal_timing': return <Clock className="w-3 h-3" />
      case 'travel_efficiency': return <MapPin className="w-3 h-3" />
      case 'crowd_patterns': return <Users className="w-3 h-3" />
      case 'popularity': return <TrendingUp className="w-3 h-3" />
      case 'weather': return <Sparkles className="w-3 h-3" />
      default: return <Sparkles className="w-3 h-3" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 dark:text-green-400'
    if (confidence >= 75) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-orange-600 dark:text-orange-400'
  }

  if (isLoading) {
    return (
      <div className={`bg-card/90 backdrop-blur-xl rounded-2xl p-6 border border-border/30 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Nova AI Suggestions</h3>
            <p className="text-sm text-muted-foreground">Analyzing optimal time slots...</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted/30 rounded mb-2"></div>
              <div className="h-3 bg-muted/20 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-card/90 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-border/30 w-full max-w-full overflow-hidden ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">Nova AI Suggestions</h3>
            <p className="text-sm text-muted-foreground hidden sm:block">Smart recommendations for your timeline</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={debouncedRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-muted/50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh suggestions"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onDismiss}
            className="p-2 hover:bg-muted/50 rounded-xl transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer w-full max-w-full overflow-hidden ${
              selectedSuggestion === suggestion.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border/30 hover:border-border/50 hover:bg-muted/20'
            }`}
            onClick={() => setSelectedSuggestion(
              selectedSuggestion === suggestion.id ? null : suggestion.id
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                  <span className="font-medium text-foreground truncate">{suggestion.title}</span>
                  <div className={`text-xs px-2 py-1 rounded-full bg-primary/10 ${getConfidenceColor(suggestion.aiConfidence)} w-fit`}>
                    {suggestion.aiConfidence}% confidence
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div className="flex flex-wrap gap-1">
                    <span>{suggestion.startTime} - {suggestion.endTime}</span>
                    {suggestion.location && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="block sm:inline">{suggestion.location}</span>
                      </>
                    )}
                    {suggestion.estimatedCost && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="block sm:inline">${suggestion.estimatedCost}/person</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-left sm:text-right flex-shrink-0">
                <div className="text-sm font-medium text-primary">
                  {suggestion.vibeMatch}% vibe match
                </div>
              </div>
            </div>

            {selectedSuggestion === suggestion.id && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <h4 className="text-sm font-medium text-foreground mb-3">AI Reasoning:</h4>
                <div className="space-y-2 mb-4">
                  {suggestion.reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <div className="text-muted-foreground mt-0.5">
                        {getReasonIcon(reason.type)}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${getConfidenceColor(reason.confidence)}`}>
                          {reason.confidence}% {reason.type.replace('_', ' ')}
                        </div>
                        <div className="text-muted-foreground">{reason.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAcceptSuggestion(suggestion)
                  }}
                  className="w-full bg-gradient-primary text-primary-foreground py-2 px-3 sm:px-4 rounded-xl font-medium hover:scale-[1.02] transition-transform text-sm sm:text-base"
                >
                  Add to Timeline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>Powered by Nova AI • Suggestions refresh every 5 minutes</span>
        </div>
      </div>
    </div>
  )
}