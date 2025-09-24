import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Clock, Calendar } from 'lucide-react'
import { FloqSelection } from '@/hooks/useCreatePlan'

interface PlanReviewStepProps {
  title: string
  description?: string
  start: string
  end: string
  selections: FloqSelection[]
  combinedName?: string
  invitedIds: string[]
  onBack: () => void
  onSubmit: () => void
  isCreating: boolean
}

const PlanReviewStep: React.FC<PlanReviewStepProps> = ({
  title,
  description,
  start,
  end,
  selections,
  combinedName,
  invitedIds,
  onBack,
  onSubmit,
  isCreating
}) => {
  const getSummaryText = () => {
    if (selections.length === 0) {
      return invitedIds.length > 0 
        ? `Solo • ${invitedIds.length} invite${invitedIds.length !== 1 ? 's' : ''}`
        : 'Solo plan'
    }
    
    if (selections.length === 1 && selections[0].type === 'existing') {
      return `Linked to: ${selections[0].name}`
    }
    
    if (combinedName) {
      const groupCount = selections.filter(s => s.type === 'existing').length + 
                        selections.filter(s => s.type === 'new').length
      return `Combined Floq: ${combinedName} (${groupCount} group${groupCount !== 1 ? 's' : ''})`
    }
    
    return 'Multiple groups'
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Review Your Plan</h2>
        <p className="text-muted-foreground">
          Double-check everything looks good before creating your plan
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{start} - {end}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-medium">{getSummaryText()}</span>
          </div>

          {invitedIds.length > 0 && (
            <div className="text-sm text-muted-foreground">
              + {invitedIds.length} friend{invitedIds.length !== 1 ? 's' : ''} invited
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={onSubmit} 
          disabled={isCreating}
          className="flex-1"
        >
          {isCreating ? 'Creating...' : 'Create Plan'}
        </Button>
      </div>
    </div>
  )
}

export default PlanReviewStep