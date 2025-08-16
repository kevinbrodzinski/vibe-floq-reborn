import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Clock, TrendingUp, Users, DollarSign, MapPin, Zap, ChevronDown, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useIntelligentTimeSlots } from '@/hooks/useIntelligentTimeSlots'
import { usePlanStops } from '@/hooks/usePlanStops'
import { useCreatePlanStop } from '@/hooks/useCreatePlanStop'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface IntelligentTimelineGridProps {
  planId: string
  planDate: string
  startTime: string
  endTime: string
  centerLocation?: { lat: number; lng: number }
  preferences?: {
    budget?: 'low' | 'medium' | 'high'
    vibes?: string[]
    activityTypes?: string[]
    crowdPreference?: 'avoid' | 'neutral' | 'seek'
  }
  groupSize?: number
  onSlotSelected?: (slot: any) => void
  className?: string
}

export function IntelligentTimelineGrid({
  planId,
  planDate,
  startTime,
  endTime,
  centerLocation,
  preferences = {},
  groupSize = 2,
  onSlotSelected,
  className = ""
}: IntelligentTimelineGridProps) {
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set())
  const [selectedVenues, setSelectedVenues] = useState<Record<string, string>>({})
  
  const { data: existingStops = [] } = usePlanStops(planId)
  const { mutate: createStop } = useCreatePlanStop()
  
  const {
    intelligentSlots,
    getVenuesForTimeSlot,
    getSuggestionsForEmptySlots,
    isLoading
  } = useIntelligentTimeSlots({
    planId,
    planDate,
    startTime,
    endTime,
    existingStops: existingStops.map(stop => ({
      id: stop.id,
      start_time: stop.start_time,
      end_time: stop.end_time,
      venue_id: stop.venue_id
    })),
    preferences,
    groupSize,
    centerLocation
  })

  const toggleSlotExpansion = (slotId: string) => {
    setExpandedSlots(prev => {
      const newSet = new Set(prev)
      if (newSet.has(slotId)) {
        newSet.delete(slotId)
      } else {
        newSet.add(slotId)
      }
      return newSet
    })
  }

  const handleAddStop = (slot: any, venue?: any) => {
    const stopData = {
      plan_id: planId,
      title: venue ? `Visit ${venue.name}` : 'New Activity',
      description: venue ? `${venue.optimal_time_reason}` : '',
      start_time: slot.startTime,
      end_time: slot.endTime,
      venue_id: venue?.id || null,
      estimated_cost_per_person: venue?.price_level ? venue.price_level * 10 : null
    }
    
    createStop(stopData)
    onSlotSelected?.(slot)
  }

  const getReasonIcon = (type: string) => {
    switch (type) {
      case 'venue_hours': return <Clock className="w-3 h-3" />
      case 'crowd_optimal': return <Users className="w-3 h-3" />
      case 'price_optimal': return <DollarSign className="w-3 h-3" />
      case 'activity_peak': return <Zap className="w-3 h-3" />
      case 'travel_efficient': return <MapPin className="w-3 h-3" />
      default: return <TrendingUp className="w-3 h-3" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-400 bg-green-500/10 border-green-500/20'
    if (confidence >= 70) return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    if (confidence >= 60) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-muted rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (intelligentSlots.length === 0) {
    return (
      <Card className={cn("text-center py-8", className)}>
        <CardContent>
          <div className="text-4xl mb-2">🤖</div>
          <h3 className="text-lg font-medium mb-2">No Smart Suggestions</h3>
          <p className="text-muted-foreground text-sm">
            {centerLocation 
              ? "Your timeline looks optimized! All time slots are either occupied or don't have strong optimization opportunities."
              : "Add a location to get intelligent time slot recommendations."
            }
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-medium">Smart Time Slots</h3>
        <Badge variant="secondary" className="text-xs">
          {intelligentSlots.length} suggestions
        </Badge>
      </div>

      <AnimatePresence>
        {intelligentSlots.map((slot, index) => {
          const isExpanded = expandedSlots.has(slot.id)
          const venues = getVenuesForTimeSlot(slot.startTime)
          const selectedVenue = selectedVenues[slot.id]
          
          return (
            <motion.div
              key={slot.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={cn(
                "border transition-all duration-200 hover:shadow-md",
                getConfidenceColor(slot.confidence)
              )}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleSlotExpansion(slot.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-semibold">{slot.startTime}</span>
                            <span className="text-xs text-muted-foreground">{slot.endTime}</span>
                          </div>
                          
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs", getConfidenceColor(slot.confidence))}
                              >
                                {slot.confidence}% optimal
                              </Badge>
                              {slot.priceOptimal && (
                                <Badge variant="secondary" className="text-xs">
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  Price-optimal
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 mt-1">
                              {slot.reasons.slice(0, 3).map((reason, i) => (
                                <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                                  {getReasonIcon(reason.type)}
                                  <span className="hidden sm:inline">{reason.description.split(' ').slice(0, 3).join(' ')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddStop(slot)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Stop
                          </Button>
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {/* Detailed reasons */}
                      <div className="space-y-2 mb-4">
                        <h4 className="text-sm font-medium">Why this time is optimal:</h4>
                        {slot.reasons.map((reason, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <div className="mt-0.5">{getReasonIcon(reason.type)}</div>
                            <div>
                              <span className="text-muted-foreground">{reason.description}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {reason.confidence}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Venue suggestions */}
                      {venues.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium">Recommended venues:</h4>
                          <div className="grid gap-2">
                            {venues.slice(0, 3).map((venue) => (
                              <div
                                key={venue.id}
                                className={cn(
                                  "p-3 rounded-lg border cursor-pointer transition-all",
                                  selectedVenue === venue.id 
                                    ? "border-primary bg-primary/5" 
                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                )}
                                onClick={() => {
                                  setSelectedVenues(prev => ({
                                    ...prev,
                                    [slot.id]: venue.id
                                  }))
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium truncate">{venue.name}</h5>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {venue.address}
                                    </p>
                                    <p className="text-xs text-primary mt-1">
                                      {venue.optimal_time_reason}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 ml-2">
                                    {venue.price_tier && (
                                      <Badge variant="outline" className="text-xs">
                                        {venue.price_tier}
                                      </Badge>
                                    )}
                                    {venue.distance_meters && (
                                      <span className="text-xs text-muted-foreground">
                                        {Math.round(venue.distance_meters / 1000 * 10) / 10}km
                                      </span>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleAddStop(slot, venue)
                                      }}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}