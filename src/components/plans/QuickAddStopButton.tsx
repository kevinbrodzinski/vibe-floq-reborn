import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUnifiedPlanStops } from '@/hooks/useUnifiedPlanStops'
import { Plus, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface QuickAddStopButtonProps {
  planId: string
  className?: string
}

export function QuickAddStopButton({ planId, className }: QuickAddStopButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const { addQuickStop, isCreating } = useUnifiedPlanStops(planId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    try {
      await addQuickStop(title.trim())
      setTitle('')
      setIsExpanded(false)
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to add stop:', error)
    }
  }

  const handleCancel = () => {
    setTitle('')
    setIsExpanded(false)
  }

  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        variant="outline"
        size="sm"
        className={className}
      >
        <Plus className="w-4 h-4 mr-2" />
        Quick Add Stop
      </Button>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Input
              placeholder="Stop name (e.g., Coffee at Blue Bottle)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isCreating}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || isCreating}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stop
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}