import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { usePlanStops } from '@/hooks/usePlanStops'
import { usePlanParticipants } from '@/hooks/usePlanParticipants'
import { useRealtimePlanSync } from '@/hooks/useRealtimePlanSync'
import { useAfterglowByPlan } from '@/hooks/useAfterglowByPlan'
import { usePlanExecutionState } from '@/hooks/usePlanExecutionState'
import { ExecutionPlanHeader } from '@/components/ExecutionPlanHeader'
import { PlanStatusTag } from '@/components/PlanStatusTag'
import { LivePlanTracker } from '@/components/LivePlanTracker'
import { CheckInButton } from '@/components/CheckInButton'
import { AutoAfterglowPrompt } from '@/components/AutoAfterglowPrompt'
import { AfterglowReflectionForm } from '@/components/AfterglowReflectionForm'
import { AfterglowSummaryCard } from '@/components/AfterglowSummaryCard'
import { AfterglowShareView } from '@/components/AfterglowShareView'
import { PostPlanReviewModal } from '@/components/plan/PostPlanReviewModal'
import { PlanFeedbackDisplay } from '@/components/plan/PlanFeedbackDisplay'
import { usePlanFeedback } from '@/hooks/usePlanFeedback'
import { useAutoPromptReview } from '@/hooks/useAutoPromptReview'
import { useUpdatePreferencesFromFeedback } from '@/hooks/useUpdatePreferencesFromFeedback'
import { PlanStatusEnum } from '@/types/enums/planStatus'
import type { PlanStop, PlanStopUi } from '@/types/plan'
// import type { AfterglowData } from '@/types/afterglow'

// ──────────────────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────────────────

const toUi = (stop: PlanStop): PlanStopUi => ({
  // fall-back values make TS happy and the UI resilient
  id: stop.id,
  title: stop.title,
  description: stop.description,
  start_time: stop.start_time,
  end_time: stop.end_time,
  stop_order: stop.stop_order ?? 0,
  venue: { id: 'venue-unknown', name: stop.venue || 'Unknown Venue' },
  address: stop.address || stop.location,
  duration_minutes: stop.duration_minutes,
  estimated_cost_per_person: stop.estimated_cost_per_person,
})

export default function FloqPlanExecutionScreen() {
  const { planId } = useParams<{ floqId: string; planId: string }>()
  
  if (!planId) {
    return <div className="p-4 text-center text-muted-foreground">Plan not found</div>
  }

  const { data: stops = [] } = usePlanStops(planId)
  const { data: participants = [] } = usePlanParticipants(planId)
  const { data: afterglow } = useAfterglowByPlan(planId)
  const { data: feedback = [] } = usePlanFeedback(planId)
  
  const {
    currentStopIndex,
    afterglowStarted,
    reflectionSubmitted,
    isExecutionComplete,
    currentStop,
    progress,
    advanceToNextStop,
    setCurrentStopIndex,
    startAfterglow,
    submitReflection,
    snoozeAfterglow,
  } = usePlanExecutionState(planId)

  // ──────────────────────────────────────────────────────────────────────────
  // live execution tracker
  // ──────────────────────────────────────────────────────────────────────────
  const trackerParticipants = participants.map(p => ({
    id           : p.user_id,
    username     : p.user_id, // Fallback since profile data is not available
    display_name : p.user_id, // Fallback since profile data is not available
    avatar_url   : undefined,
    checked_in_at: undefined,
  }))

  const [showReviewModal, setShowReviewModal] = useState(false)
  const updatePreferences = useUpdatePreferencesFromFeedback()

  // Set up real-time sync
  useRealtimePlanSync({ plan_id: planId })

  // Auto-prompt review when plan execution completes
  useAutoPromptReview(
    planId,
    isExecutionComplete,
    () => setShowReviewModal(true)
  )

  const shouldShowAfterglowPrompt = isExecutionComplete && !afterglow && !afterglowStarted
  const shouldShowReflectionForm = afterglowStarted && !reflectionSubmitted && !afterglow
  const shouldShowSummary = afterglow && !reflectionSubmitted
  const shouldShowShare = afterglow && reflectionSubmitted

  // Handle feedback submission with preference learning
  const handleFeedbackSubmit = (feedback: any) => {
    // Update user preferences based on feedback
    if (feedback.favorite_moment) {
      // Infer vibe from rating or default to 'chill'
      const vibe = feedback.vibe_rating >= 4 ? 'energetic' : feedback.vibe_rating >= 3 ? 'chill' : 'cozy';
      updatePreferences.mutate({
        vibe,
        moment: feedback.favorite_moment,
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <ExecutionPlanHeader 
            planId={planId} 
            currentStopIndex={currentStopIndex}
            progress={progress}
          />
          <PlanStatusTag status={PlanStatusEnum.enum.executing} />
        </div>

        {/* Main Execution Content */}
        <div className="space-y-6">
          {/* Live Tracker */}
          <LivePlanTracker
            planId={planId}
            stops={stops.map(toUi)}
            currentStopIndex={currentStopIndex}
            participants={trackerParticipants}
            onStopAdvance={() => {
              if (currentStopIndex < stops.length - 1) {
                advanceToNextStop()
              }
            }}
          />

          {/* Check-In Section */}
          {currentStop && !isExecutionComplete && (
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{currentStop.title}</h3>
                  {currentStop.description && (
                    <p className="text-muted-foreground mt-1">{currentStop.description}</p>
                  )}
                </div>
                <CheckInButton
                  planId={planId}
                  stopId={currentStop.id}
                  size="lg"
                />
              </div>
            </div>
          )}

          {/* Afterglow Prompt */}
          {shouldShowAfterglowPrompt && (
            <AutoAfterglowPrompt
              planId={planId}
              planTitle={stops[0]?.title || 'Your Experience'}
              isActive={true}
              onAccept={startAfterglow}
              onDismiss={() => {
                // User dismissed, we can respect that
              }}
              onSnooze={snoozeAfterglow}
            />
          )}

          {/* Reflection Form */}
          {shouldShowReflectionForm && (
            <AfterglowReflectionForm
              planId={planId}
              planTitle={stops[0]?.title || 'Your Experience'}
              onSubmit={submitReflection}
              onSkip={() => {
                // Mark as submitted to exit the flow
                submitReflection()
              }}
            />
          )}

          {/* Summary Card */}
          {shouldShowSummary && afterglow && (
            <AfterglowSummaryCard afterglow={afterglow as any} />
          )}

          {/* Plan Feedback Display */}
          <PlanFeedbackDisplay 
            planId={planId}
          />

          {/* Share View */}
          {shouldShowShare && afterglow && (
            <AfterglowShareView afterglow={afterglow as any} />
          )}

          {/* Development Controls (TODO: Remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-muted/50 border border-dashed rounded-lg p-4">
              <h4 className="font-medium mb-2">Debug Controls</h4>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => setCurrentStopIndex(Math.max(0, currentStopIndex - 1))}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                  disabled={currentStopIndex === 0}
                >
                  Previous Stop
                </button>
                <button 
                  onClick={advanceToNextStop}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                  disabled={currentStopIndex >= stops.length - 1}
                >
                  Next Stop
                </button>
                <button 
                  onClick={startAfterglow}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                >
                  Start Ripple
                </button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Current: Stop {currentStopIndex + 1}/{stops.length} | 
                Ripple: {afterglowStarted ? 'Started' : 'Not Started'} | 
                Complete: {isExecutionComplete ? 'Yes' : 'No'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post Plan Review Modal */}
      {showReviewModal && (
        <PostPlanReviewModal
          planId={planId}
          planTitle={stops[0]?.title || 'Your Experience'}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </div>
  )
}