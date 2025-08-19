import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Sparkles, 
  AlertTriangle, 
  Users, 
  Clock, 
  Settings, 
  MapPin,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react'

// Import existing components
import { TimelineGrid } from './TimelineGrid'
import { IntelligentTimelineGrid } from './IntelligentTimelineGrid'
import { SmartConflictResolver } from './SmartConflictResolver'
import { LivePlanTimeline } from './LivePlanTimeline'

// Import hooks
import { usePlanStops } from '@/hooks/usePlanStops'
import { useRealtimePlanSync } from '@/hooks/useRealtimePlanSync'
import { usePlanParticipantsOptimized } from '@/hooks/usePlanParticipantsOptimized'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface EnhancedPlanTimelineProps {
  planId: string
  planData: {
    id: string
    title: string
    planned_at: string
    start_time?: string
    end_time?: string
    status: string
    location?: { lat: number; lng: number }
    vibe_tag?: string
  }
  preferences?: {
    budget?: 'low' | 'medium' | 'high'
    vibes?: string[]
    activityTypes?: string[]
    crowdPreference?: 'avoid' | 'neutral' | 'seek'
  }
  className?: string
}

export function EnhancedPlanTimeline({
  planId,
  planData,
  preferences = {},
  className = ""
}: EnhancedPlanTimelineProps) {
  const [activeTab, setActiveTab] = useState('timeline')
  const [showIntelligentSuggestions, setShowIntelligentSuggestions] = useState(true)
  const [conflictCount, setConflictCount] = useState(0)
  const [suggestionCount, setSuggestionCount] = useState(0)
  
  const { session } = useAuth()
  const { data: stops = [] } = usePlanStops(planId)
  const { data: participants = [] } = usePlanParticipantsOptimized(planId)

  // Real-time sync for collaborative features
  const { isConnected } = useRealtimePlanSync({
    plan_id: planId,
    onStopAdded: (stop) => {
      console.log('Stop added in real-time:', stop)
    },
    onStopUpdated: (stop) => {
      console.log('Stop updated in real-time:', stop)
    },
    onParticipantJoined: (participant) => {
      console.log('Participant joined:', participant)
    }
  })

  // Determine timeline mode based on plan status
  const timelineMode = useMemo(() => {
    switch (planData.status) {
      case 'draft':
        return 'planning'
      case 'finalized':
        return 'finalized'
      case 'executing':
        return 'live'
      case 'completed':
        return 'review'
      default:
        return 'planning'
    }
  }, [planData.status])

  // Calculate plan metrics
  const planMetrics = useMemo(() => {
    const totalStops = stops.length
    const hasConflicts = conflictCount > 0
    const hasLocation = !!planData.location
    const activeParticipants = participants.filter(p => p.rsvp_status === 'attending').length
    
    return {
      totalStops,
      hasConflicts,
      hasLocation,
      activeParticipants,
      completeness: Math.round(((totalStops > 0 ? 1 : 0) + (hasLocation ? 1 : 0) + (activeParticipants > 0 ? 1 : 0)) / 3 * 100)
    }
  }, [stops, conflictCount, planData.location, participants])

  const planDate = format(new Date(planData.planned_at), 'yyyy-MM-dd')
  const startTime = planData.start_time || '18:00'
  const endTime = planData.end_time || '23:00'

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with plan status and metrics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-lg">{planData.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(planData.planned_at), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <Badge variant={planData.status === 'executing' ? 'default' : 'secondary'}>
                {planData.status}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{planMetrics.activeParticipants} attending</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{planMetrics.totalStops} stops</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isConnected ? "bg-green-400" : "bg-gray-400"
                )} />
                <span className="text-xs">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Progress indicators */}
          <div className="flex items-center gap-4 pt-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span>Plan Completeness</span>
                <span>{planMetrics.completeness}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className="bg-primary rounded-full h-1.5 transition-all duration-300"
                  style={{ width: `${planMetrics.completeness}%` }}
                />
              </div>
            </div>

            {conflictCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {conflictCount} conflicts
              </Badge>
            )}

            {suggestionCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                {suggestionCount} suggestions
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Main timeline interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Smart Suggestions
            {suggestionCount > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {suggestionCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Conflicts
            {conflictCount > 0 && (
              <Badge variant="destructive" className="text-xs ml-1">
                {conflictCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Live View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          {timelineMode === 'live' ? (
            <LivePlanTimeline planId={planId} />
          ) : (
            <div className="space-y-4">
              {/* Intelligence toggle */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Plan Timeline</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIntelligentSuggestions(!showIntelligentSuggestions)}
                  className="flex items-center gap-2"
                >
                  {showIntelligentSuggestions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showIntelligentSuggestions ? 'Hide' : 'Show'} AI Suggestions
                </Button>
              </div>

              <TimelineGrid
                planId={planId}
                planStatus={planData.status}
                startTime={startTime}
                endTime={endTime}
                activeParticipants={participants}
                connectionStatus={isConnected ? 'connected' : 'disconnected'}
              />

              {/* Inline smart suggestions */}
              {showIntelligentSuggestions && planData.location && (
                <Card className="border-dashed border-purple-200/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <CardTitle className="text-sm">Quick Add Suggestions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <IntelligentTimelineGrid
                      planId={planId}
                      planDate={planDate}
                      startTime={startTime}
                      endTime={endTime}
                      centerLocation={planData.location}
                      preferences={preferences}
                      groupSize={planMetrics.activeParticipants}
                      onSlotSelected={(slot) => {
                        console.log('Smart slot selected:', slot)
                      }}
                      className="max-h-96 overflow-y-auto"
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Smart Suggestions</h3>
              <Badge variant="outline" className="text-xs">
                AI-Powered
              </Badge>
            </div>

            {planData.location ? (
              <IntelligentTimelineGrid
                planId={planId}
                planDate={planDate}
                startTime={startTime}
                endTime={endTime}
                centerLocation={planData.location}
                preferences={preferences}
                groupSize={planMetrics.activeParticipants}
                onSlotSelected={(slot) => {
                  setSuggestionCount(prev => Math.max(0, prev - 1))
                }}
              />
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <h3 className="text-sm font-medium mb-1">Location Required</h3>
                  <p className="text-xs text-muted-foreground">
                    Add a location to your plan to get intelligent suggestions
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Timeline Analysis</h3>
              <Badge variant="outline" className="text-xs">
                Auto-Detection
              </Badge>
            </div>

            <SmartConflictResolver
              planId={planId}
              planDate={planDate}
              onConflictResolved={(conflictId) => {
                setConflictCount(prev => Math.max(0, prev - 1))
                console.log('Conflict resolved:', conflictId)
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Live Plan Execution</h3>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  isConnected ? "bg-green-400" : "bg-gray-400"
                )} />
                <span className="text-xs">
                  {isConnected ? 'Real-time updates active' : 'Connecting...'}
                </span>
              </div>
            </div>

            <LivePlanTimeline planId={planId} />

            {/* Live collaboration indicators */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Active Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {participants
                    .filter(p => p.rsvp_status === 'attending')
                    .slice(0, 6)
                    .map((participant) => (
                      <div key={participant.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {participant.display_name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <span className="text-xs">{participant.display_name}</span>
                      </div>
                    ))}
                  
                  {participants.filter(p => p.rsvp_status === 'attending').length > 6 && (
                    <Badge variant="secondary" className="text-xs">
                      +{participants.filter(p => p.rsvp_status === 'attending').length - 6} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Hook to track suggestion and conflict counts
export function usePlanIntelligence(planId: string) {
  const [suggestionCount, setSuggestionCount] = useState(0)
  const [conflictCount, setConflictCount] = useState(0)
  
  // This would integrate with your intelligence hooks to track counts
  // For now, returning mock data
  return {
    suggestionCount,
    conflictCount,
    setSuggestionCount,
    setConflictCount
  }
}