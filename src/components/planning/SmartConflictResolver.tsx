import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Clock, ArrowRight, CheckCircle, X, Lightbulb, Shuffle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { usePlanStops } from '@/hooks/usePlanStops'
import { useUpdatePlanStop } from '@/hooks/useUpdatePlanStop'
import { useIntelligentTimeSlots } from '@/hooks/useIntelligentTimeSlots'
import { cn } from '@/lib/utils'
import { addMinutes, parseISO, format, isWithinInterval } from 'date-fns'

interface TimeConflict {
  id: string
  type: 'overlap' | 'insufficient_travel' | 'venue_closed' | 'poor_timing'
  severity: 'high' | 'medium' | 'low'
  affectedStops: string[]
  description: string
  suggestions: ConflictSuggestion[]
}

interface ConflictSuggestion {
  id: string
  type: 'reschedule' | 'reorder' | 'alternative_venue' | 'adjust_duration'
  confidence: number
  description: string
  changes: Array<{
    stopId: string
    field: string
    currentValue: any
    suggestedValue: any
    reason: string
  }>
  impact: {
    travelTime?: number
    costDifference?: number
    vibeMatch?: number
    timeOptimality?: number
  }
}

interface SmartConflictResolverProps {
  planId: string
  planDate: string
  onConflictResolved?: (conflictId: string) => void
  className?: string
}

export function SmartConflictResolver({
  planId,
  planDate,
  onConflictResolved,
  className = ""
}: SmartConflictResolverProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<string, string>>({})
  const [resolvingConflicts, setResolvingConflicts] = useState<Set<string>>(new Set<string>())
  
  const { data: stops = [], isLoading } = usePlanStops(planId)
  const { mutate: updateStop } = useUpdatePlanStop()

  // Detect conflicts in the current timeline
  const conflicts = useMemo(() => {
    const detectedConflicts: TimeConflict[] = []
    
    // Sort stops by start time for conflict detection
    const sortedStops = [...stops].sort((a, b) => {
      const timeA = a.start_time || '00:00'
      const timeB = b.start_time || '00:00'
      return timeA.localeCompare(timeB)
    })

    for (let i = 0; i < sortedStops.length - 1; i++) {
      const currentStop = sortedStops[i]
      const nextStop = sortedStops[i + 1]
      
      if (!currentStop.start_time || !currentStop.end_time || !nextStop.start_time) continue

      // Check for time overlaps
      const currentEnd = parseISO(`${planDate}T${currentStop.end_time}`)
      const nextStart = parseISO(`${planDate}T${nextStop.start_time}`)
      
      if (currentEnd > nextStart) {
        detectedConflicts.push({
          id: `overlap-${currentStop.id}-${nextStop.id}`,
          type: 'overlap',
          severity: 'high',
          affectedStops: [currentStop.id, nextStop.id],
          description: `"${currentStop.title}" overlaps with "${nextStop.title}"`,
          suggestions: generateOverlapSuggestions(currentStop, nextStop, planDate)
        })
      }

      // Check for insufficient travel time (if both stops have venues)
      if (currentStop.venue_id && nextStop.venue_id) {
        const timeBetween = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60) // minutes
        const estimatedTravelTime = calculateTravelTime(currentStop, nextStop) // This would need implementation
        
        if (timeBetween < estimatedTravelTime) {
          detectedConflicts.push({
            id: `travel-${currentStop.id}-${nextStop.id}`,
            type: 'insufficient_travel',
            severity: 'medium',
            affectedStops: [currentStop.id, nextStop.id],
            description: `Only ${timeBetween}min between stops, need ~${estimatedTravelTime}min travel time`,
            suggestions: generateTravelTimeSuggestions(currentStop, nextStop, estimatedTravelTime, planDate)
          })
        }
      }
    }

    return detectedConflicts
  }, [stops, planDate])

  const applySuggestion = async (conflictId: string, suggestionId: string) => {
    const conflict = conflicts.find(c => c.id === conflictId)
    const suggestion = conflict?.suggestions.find(s => s.id === suggestionId)
    
    if (!suggestion) return

    setResolvingConflicts(prev => new Set(prev.add(conflictId)))

    try {
      // Apply all changes in the suggestion
      for (const change of suggestion.changes) {
        await updateStop({
          id: change.stopId,
          plan_id: planId,
          [change.field]: change.suggestedValue
        })
      }
      
      onConflictResolved?.(conflictId)
    } catch (error) {
      console.error('Failed to apply suggestion:', error)
    } finally {
      setResolvingConflicts(prev => {
        const newSet = new Set(prev)
        newSet.delete(conflictId)
        return newSet
      })
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'overlap': return <AlertTriangle className="w-4 h-4" />
      case 'insufficient_travel': return <Clock className="w-4 h-4" />
      case 'venue_closed': return <X className="w-4 h-4" />
      case 'poor_timing': return <Lightbulb className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-4 bg-muted rounded w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (conflicts.length === 0) {
    return (
      <Card className={cn("text-center py-6", className)}>
        <CardContent>
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="text-sm font-medium mb-1">No Conflicts Detected</h3>
          <p className="text-xs text-muted-foreground">
            Your timeline is optimized and conflict-free!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-medium">Timeline Conflicts</h3>
        <Badge variant="destructive" className="text-xs">
          {conflicts.length} issue{conflicts.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <AnimatePresence>
        {conflicts.map((conflict) => {
          const selectedSuggestion = selectedSuggestions[conflict.id]
          const isResolving = resolvingConflicts.has(conflict.id)
          
          return (
            <motion.div
              key={conflict.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className={cn("border", getSeverityColor(conflict.severity))}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getTypeIcon(conflict.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-sm">{conflict.description}</CardTitle>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getSeverityColor(conflict.severity))}
                        >
                          {conflict.severity} priority
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Affects {conflict.affectedStops.length} stop{conflict.affectedStops.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Suggested solutions:</h4>
                    
                    {conflict.suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all",
                          selectedSuggestion === suggestion.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                        onClick={() => {
                          setSelectedSuggestions(prev => ({
                            ...prev,
                            [conflict.id]: suggestion.id
                          }))
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="text-sm font-medium">{suggestion.description}</h5>
                              <Badge variant="outline" className="text-xs">
                                {suggestion.confidence}% confidence
                              </Badge>
                            </div>
                            
                            <div className="space-y-1">
                              {suggestion.changes.map((change, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground">
                                    {change.field}:
                                  </span>
                                  <span className="line-through text-muted-foreground">
                                    {change.currentValue}
                                  </span>
                                  <ArrowRight className="w-3 h-3" />
                                  <span className="text-primary font-medium">
                                    {change.suggestedValue}
                                  </span>
                                  <span className="text-muted-foreground">
                                    ({change.reason})
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Impact indicators */}
                            {Object.keys(suggestion.impact).length > 0 && (
                              <div className="flex items-center gap-3 mt-2 text-xs">
                                {suggestion.impact.travelTime && (
                                  <span className="text-green-400">
                                    +{suggestion.impact.travelTime}min travel
                                  </span>
                                )}
                                {suggestion.impact.vibeMatch && (
                                  <span className="text-blue-400">
                                    {suggestion.impact.vibeMatch}% vibe match
                                  </span>
                                )}
                                {suggestion.impact.timeOptimality && (
                                  <span className="text-purple-400">
                                    {suggestion.impact.timeOptimality}% time optimal
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {selectedSuggestion === suggestion.id && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                applySuggestion(conflict.id, suggestion.id)
                              }}
                              disabled={isResolving}
                              className="ml-3"
                            >
                              {isResolving ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <Shuffle className="w-4 h-4" />
                                </motion.div>
                              ) : (
                                <>Apply Fix</>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// Helper functions for generating suggestions
function generateOverlapSuggestions(stop1: any, stop2: any, planDate: string): ConflictSuggestion[] {
  const suggestions: ConflictSuggestion[] = []
  
  // Suggestion 1: Adjust end time of first stop
  const earlierEndTime = format(
    addMinutes(parseISO(`${planDate}T${stop2.start_time}`), -15),
    'HH:mm'
  )
  
  suggestions.push({
    id: 'adjust-end-time',
    type: 'adjust_duration',
    confidence: 85,
    description: 'Shorten first activity to prevent overlap',
    changes: [{
      stopId: stop1.id,
      field: 'end_time',
      currentValue: stop1.end_time,
      suggestedValue: earlierEndTime,
      reason: '15min buffer'
    }],
    impact: {
      timeOptimality: 80
    }
  })

  // Suggestion 2: Delay second stop
  const laterStartTime = format(
    addMinutes(parseISO(`${planDate}T${stop1.end_time}`), 15),
    'HH:mm'
  )
  
  suggestions.push({
    id: 'delay-second',
    type: 'reschedule',
    confidence: 78,
    description: 'Delay second activity to create buffer',
    changes: [{
      stopId: stop2.id,
      field: 'start_time',
      currentValue: stop2.start_time,
      suggestedValue: laterStartTime,
      reason: 'travel buffer'
    }],
    impact: {
      travelTime: 15
    }
  })

  return suggestions
}

function generateTravelTimeSuggestions(stop1: any, stop2: any, neededTime: number, planDate: string): ConflictSuggestion[] {
  const suggestions: ConflictSuggestion[] = []
  
  // Calculate needed adjustment
  const currentGap = Math.abs(
    parseISO(`${planDate}T${stop2.start_time}`).getTime() - 
    parseISO(`${planDate}T${stop1.end_time}`).getTime()
  ) / (1000 * 60)
  
  const adjustment = neededTime - currentGap + 10 // 10min buffer
  
  suggestions.push({
    id: 'adjust-for-travel',
    type: 'reschedule',
    confidence: 90,
    description: `Add ${Math.round(adjustment)}min for realistic travel time`,
    changes: [{
      stopId: stop2.id,
      field: 'start_time',
      currentValue: stop2.start_time,
      suggestedValue: format(
        addMinutes(parseISO(`${planDate}T${stop2.start_time}`), adjustment),
        'HH:mm'
      ),
      reason: `${neededTime}min travel + buffer`
    }],
    impact: {
      travelTime: neededTime
    }
  })

  return suggestions
}

// Placeholder function - would need actual implementation with routing API
function calculateTravelTime(stop1: any, stop2: any): number {
  // This would integrate with your transit calculator or routing API
  // For now, return a reasonable estimate based on distance
  return 20 // minutes
}