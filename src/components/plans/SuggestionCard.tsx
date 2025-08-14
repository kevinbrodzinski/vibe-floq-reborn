import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useUnifiedPlanStops } from '@/hooks/useUnifiedPlanStops'
import { useSession } from '@/hooks/useSession'
import { PlanSuggestion } from '@/hooks/usePlanRecap'

interface SuggestionCardProps {
  suggestion: PlanSuggestion
  planId: string
}

export function SuggestionCard({ suggestion, planId }: SuggestionCardProps) {
  const session = useSession()
  const { addStopFromSuggestion, isCreating } = useUnifiedPlanStops(planId)

  const handleAddAsStop = async () => {
    if (!session?.user) {
      toast.error('Please sign in to add stops')
      return
    }

    try {
      await addStopFromSuggestion({
        title: suggestion.title,
        body: suggestion.body
      })
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to add suggestion as stop:', error)
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">{suggestion.emoji}</div>
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
            <p className="text-xs text-muted-foreground mb-3">{suggestion.body}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddAsStop}
              disabled={isCreating}
              className="text-xs h-7"
            >
              <Plus className="w-3 h-3 mr-1" />
              {isCreating ? 'Adding...' : 'Add as Stop'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}