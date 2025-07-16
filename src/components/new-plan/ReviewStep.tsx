import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, Tag, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface PlanDraft {
  title: string
  description?: string
  vibe_tag?: string
  invitedUserIds: string[]
  start: string
  end: string
  duration_hours: number
}

interface Props {
  draft: PlanDraft
  onCreate: () => void
  isCreating: boolean
  onBack?: () => void
}

export function ReviewStep({ draft, onCreate, isCreating, onBack }: Props) {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return format(date, 'h:mm a')
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Review Your Plan</h3>
        <p className="text-muted-foreground">
          Make sure everything looks good before we create your plan
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{draft.title}</span>
            {draft.vibe_tag && (
              <Badge variant="secondary" className="capitalize">
                <Tag className="w-3 h-3 mr-1" />
                {draft.vibe_tag}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Description */}
          {draft.description && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
              <p className="text-sm">{draft.description}</p>
            </div>
          )}

          {/* Time Window */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatTime(draft.start)} — {formatTime(draft.end)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{draft.duration_hours} hour window</span>
            </div>
          </div>

          {/* Plan Features */}
          <div className="pt-4 border-t space-y-2">
            <h4 className="font-medium text-sm">What's included:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Interactive timeline editor</li>
              <li>• AI-powered stop suggestions from Nova</li>
              <li>• Real-time collaboration with friends</li>
              <li>• Smart conflict detection</li>
              <li>• Voting on suggested stops</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={onCreate} 
        className="w-full" 
        size="lg"
        disabled={isCreating}
      >
        {isCreating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Plan...
          </>
        ) : (
          'Create Plan'
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        You can always edit your plan after creation
      </p>
    </div>
  )
}