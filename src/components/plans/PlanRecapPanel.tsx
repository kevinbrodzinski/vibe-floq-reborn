import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'
import { usePlanRecap } from '@/hooks/usePlanRecap'
import { useGeneratePlanRecap } from '@/hooks/useGeneratePlanRecap'
import { useFinishPlan } from '@/hooks/useFinishPlan'
import { SuggestionCard } from './SuggestionCard'
import ReactMarkdown from 'react-markdown'

interface PlanRecapPanelProps {
  planId: string
  planMode: string
  onPlanFinished?: () => void
}

export function PlanRecapPanel({ planId, planMode, onPlanFinished }: PlanRecapPanelProps) {
  const { data: recap, isLoading, error, refetch } = usePlanRecap(planId)
  const generateRecap = useGeneratePlanRecap()
  const finishPlan = useFinishPlan()

  // Don't show if plan isn't finalized
  if (planMode !== 'finalized') {
    return null
  }

  const handleGenerateRecap = () => {
    generateRecap.mutate({ planId })
  }

  const handleFinishPlan = () => {
    finishPlan.mutate({ planId }, {
      onSuccess: () => {
        onPlanFinished?.()
      }
    })
  }

  const handleRetry = () => {
    refetch()
  }

  // No recap record exists yet
  if (!recap && !isLoading && !error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate AI Recap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Get an AI-generated recap of your plan with smart follow-up suggestions.
          </p>
          <Button 
            onClick={handleGenerateRecap}
            disabled={generateRecap.isPending}
            className="w-full"
          >
            {generateRecap.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Recap
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading recap...
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error || !recap) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 text-destructive mb-4">
            <AlertCircle className="w-4 h-4" />
            Failed to load recap
          </div>
          <Button onClick={handleRetry} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Pending state
  if (recap.status === 'pending') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            Generating AI Recap...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">AI Working</Badge>
            <span className="text-sm text-muted-foreground">
              This usually takes 10-30 seconds
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state from AI
  if (recap.status === 'error') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Failed to Generate Recap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {recap.error_message || 'Something went wrong generating your recap.'}
          </p>
          <Button onClick={handleGenerateRecap} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Success state - show recap
  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Plan Recap
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recap.summary_md && (
            <div className="prose prose-sm max-w-none mb-4">
              <ReactMarkdown>{recap.summary_md}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>

      {recap.suggestions && recap.suggestions.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Follow-up Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {recap.suggestions.map((suggestion, index) => (
                <SuggestionCard 
                  key={index} 
                  suggestion={suggestion} 
                  planId={planId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="w-full border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Mark Plan as Finished</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This will mark the plan as completed, disband any auto-disband Floqs, and award XP to participants.
          </p>
          <Button 
            onClick={handleFinishPlan}
            disabled={finishPlan.isPending}
            className="w-full"
            size="lg"
          >
            {finishPlan.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finishing Plan...
              </>
            ) : (
              'Mark as Finished'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}