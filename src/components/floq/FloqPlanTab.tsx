import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus, Mic } from 'lucide-react'
import { useActiveFloqPlan } from '@/hooks/useActiveFloqPlan'
import { PlanHeader } from './PlanHeader'
import { MobileTimelineGrid } from '@/components/planning/MobileTimelineGrid'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/integrations/supabase/types'

type Floq = Database['public']['Tables']['floqs']['Row']

// Mock floq data - in real implementation, this would come from useFloq hook
const mockFloq: Floq = {
  id: 'mock-floq-id',
  title: 'Test Floq',
  name: 'Test Floq',
  description: null,
  primary_vibe: 'chill',
  vibe_tag: 'chill',
  type: 'auto',
  flock_type: 'momentary',
  starts_at: new Date().toISOString(),
  ends_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  creator_id: 'mock-creator-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  expires_at: null,
  flock_tags: [],
  location: null,
  max_participants: 20,
  radius_m: 100,
  geo: null,
  visibility: 'public',
  walkable_zone: null,
  catchment_area: null,
  activity_score: 1,
  last_activity_at: new Date().toISOString(),
  auto_created: false,
  recurrence_pattern: null,
  parent_flock_id: null,
  pinned_note: null
}

export function FloqPlanTab() {
  const { floqId } = useParams<{ floqId: string }>()
  const { data: plan, isLoading } = useActiveFloqPlan(floqId)
  const [voiceOpen, setVoiceOpen] = useState(false)

  if (isLoading || !plan) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      <PlanHeader floq={mockFloq} plan={plan} />

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
          onMouseDown={(e) => {
            // Simple long press detection for web
            const timer = setTimeout(() => setVoiceOpen(true), 500)
            const handleMouseUp = () => {
              clearTimeout(timer)
              document.removeEventListener('mouseup', handleMouseUp)
            }
            document.addEventListener('mouseup', handleMouseUp)
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