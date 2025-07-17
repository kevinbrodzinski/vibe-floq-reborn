import React, { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus, Mic } from 'lucide-react'
import { useActiveFloqPlan } from '@/hooks/useActiveFloqPlan'
import { useFloqDetails } from '@/hooks/useFloqDetails'
import { PlanHeader } from './PlanHeader'
import { MobileTimelineGrid } from '@/components/planning/MobileTimelineGrid'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/integrations/supabase/types'

type Floq = Database['public']['Tables']['floqs']['Row']


export function FloqPlanTab() {
  const { floqId } = useParams<{ floqId: string }>()
  const { data: floq } = useFloqDetails(floqId)
  const { data: plan, isLoading } = useActiveFloqPlan(floqId)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  if (isLoading || !plan || !floq) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    )
  }

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
          />
        </TabsContent>

        <TabsContent value="rsvp" className="flex-1 mt-0 p-4">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">RSVP Status</h3>
            <p className="text-muted-foreground">
              Track who's attending this plan
            </p>
            {/* RSVPScreen component would go here */}
          </div>
        </TabsContent>

        <TabsContent value="summary" className="flex-1 mt-0 p-4">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Plan Summary</h3>
            <p className="text-muted-foreground">
              AI-generated recap of your plan
            </p>
            {/* PlanSummaryCard component would go here */}
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        <Button
          size="icon"
          className="rounded-full h-14 w-14 shadow-lg"
          onPointerDown={() => {
            longPressTimerRef.current = setTimeout(() => setVoiceOpen(true), 500)
          }}
          onPointerUp={() => {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current)
              longPressTimerRef.current = null
            }
          }}
          onPointerLeave={() => {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current)
              longPressTimerRef.current = null
            }
          }}
          onClick={() => {
            // Handle regular click - open add stop modal
            console.log('Add stop clicked')
          }}
        >
          <Plus size={28} />
        </Button>
      </div>

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