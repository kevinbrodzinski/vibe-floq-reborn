
import React, { useState, useRef, useEffect } from 'react'
import type { TimerId } from '@/types/Timer'
import { useParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus, Mic } from 'lucide-react'
import { useActiveFloqPlan } from '@/hooks/useActiveFloqPlan'
import { useFloqDetails } from '@/hooks/useFloqDetails'
import { useCollaborativeState } from '@/hooks/useCollaborativeState'
import { PlanHeader } from './PlanHeader'
import { MobileTimelineGrid } from '@/components/planning/MobileTimelineGrid'
import { AddStopModeSelector } from '@/components/planning/AddStopModeSelector'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/integrations/supabase/types'

type Floq = Database['public']['Tables']['floqs']['Row']

export function FloqPlanTab() {
  const { floqId } = useParams<{ floqId: string }>()
  const { data: floq } = useFloqDetails(floqId)
  const { data: plan, isLoading } = useActiveFloqPlan(floqId)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [showAddStopModal, setShowAddStopModal] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const longPressTimerRef = useRef<TimerId | null>(null)

  // Get collaborative state for the plan
  const {
    stops,
    isLoading: stopsLoading,
    isReordering,
    handleStopReorder
  } = useCollaborativeState({ planId: plan?.id || '', enabled: !!plan?.id })

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  const handleAddStop = (timeSlot?: string) => {
    console.log('🔍 handleAddStop called with timeSlot:', timeSlot)
    const selectedSlot = timeSlot || '19:00'
    console.log('🔍 Setting selectedTimeSlot to:', selectedSlot)
    setSelectedTimeSlot(selectedSlot)
    console.log('🔍 Opening AddStopModal')
    setShowAddStopModal(true)
  }

  const handleCloseAddStopModal = () => {
    console.log('🔍 Closing AddStopModal')
    setShowAddStopModal(false)
    setSelectedTimeSlot(null)
  }

  const handleLongPress = () => {
    longPressTimerRef.current = setTimeout(() => setVoiceOpen(true), 500)
  }

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  if (isLoading || !plan || !floq) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    )
  }

  console.log('🔍 FloqPlanTab render - showAddStopModal:', showAddStopModal, 'selectedTimeSlot:', selectedTimeSlot)

  return (
    <div className="flex flex-col h-full relative">
      <PlanHeader floq={floq} plan={plan} />

      <Tabs defaultValue="timeline" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 border-b border-border/20">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="rsvp">RSVP</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="flex-1 mt-0">
          <MobileTimelineGrid
            planId={plan.id}
            planStatus={plan.status || 'draft'}
            startTime={plan.start_time || '18:00'}
            endTime={plan.end_time || '23:59'}
            stops={stops}
            onAddStop={handleAddStop}
            onStopReorder={(activeId: string, overId: string) => {
              // Convert overId to index for handleStopReorder
              const stopsArray = stops || []
              const overIndex = stopsArray.findIndex(stop => stop.id === overId)
              if (overIndex !== -1) {
                handleStopReorder(activeId, overIndex)
              }
            }}
            onStopSelect={(stopId) => console.log('Selected stop:', stopId)}
          />
        </TabsContent>

        <TabsContent value="rsvp" className="flex-1 mt-0 p-4">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">RSVP Status</h3>
            <p className="text-muted-foreground">
              Track who's attending this plan
            </p>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="flex-1 mt-0 p-4">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Plan Summary</h3>
            <p className="text-muted-foreground">
              AI-generated recap of your plan
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Floating Action Button with Accessibility */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        <Button
          size="icon"
          className="rounded-full h-14 w-14 shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Add Stop to Plan"
          tabIndex={0}
          onPointerDown={handleLongPress}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={() => {
            console.log('🔍 FAB clicked')
            handleAddStop()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleAddStop()
            }
          }}
        >
          <Plus size={28} />
        </Button>
      </div>

      {/* Add Stop Mode Selector */}
      {selectedTimeSlot && (
        <AddStopModeSelector
          isOpen={showAddStopModal}
          onClose={handleCloseAddStopModal}
          planId={plan.id}
          timeSlot={selectedTimeSlot}
        />
      )}

      {/* Voice Input Sheet - placeholder */}
      {voiceOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 m-4 max-w-sm w-full">
            <div className="text-center">
              <Mic className="mx-auto mb-4 text-primary" size={48} />
              <h3 className="text-lg font-semibold mb-2">Voice Input</h3>
              <p className="text-muted-foreground mb-4">
                Speak to add a stop to your plan
              </p>
              <Button 
                variant="outline" 
                onClick={() => setVoiceOpen(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
