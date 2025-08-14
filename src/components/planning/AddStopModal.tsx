
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useUnifiedPlanStops } from '@/hooks/useUnifiedPlanStops'
import { useSmartTimeSuggestion } from '@/hooks/useSmartTimeSuggestion'
import { usePlanStops } from '@/hooks/usePlanStops'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { NovaIndicator } from './NovaIndicator'
import { Clock, MapPin, DollarSign, Sparkles } from 'lucide-react'

interface AddStopModalProps {
  isOpen: boolean
  onClose: () => void
  planId: string
  defaultStartTime?: string
  defaultEndTime?: string
}

export function AddStopModal({ 
  isOpen, 
  onClose, 
  planId, 
  defaultStartTime = '19:00',
  defaultEndTime = '20:00'
}: AddStopModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState(defaultStartTime)
  const [endTime, setEndTime] = useState(defaultEndTime)
  const [estimatedCost, setEstimatedCost] = useState('')
  const [usedNovaSuggestion, setUsedNovaSuggestion] = useState(false)

  const { createStop, isCreating } = useUnifiedPlanStops(planId)
  const { data: stops = [] } = usePlanStops(planId)
  const { data: userPreferences } = useUserPreferences()
  
  // Get Nova suggestion when venue/title changes
  const suggestedTime = useSmartTimeSuggestion({
    planStartTime: '18:00', // Could get from plan data
    planEndTime: '23:00',   // Could get from plan data
    existingStops: stops,
    venueMetadata: {
      type: 'restaurant', // Could derive from title
      ideal_times: ['19:00', '20:00'],
      open_hours: ['17:00-23:00']
    }
  })

  // Auto-apply Nova suggestion when modal opens
  useEffect(() => {
    if (isOpen && title && userPreferences?.prefer_smart_suggestions !== false) {
      const suggestion = suggestedTime
      if (suggestion && suggestion !== startTime) {
        setStartTime(suggestion)
        // Calculate end time (90 min default)
        const [hours, minutes] = suggestion.split(':').map(Number)
        const endDate = new Date()
        endDate.setHours(hours, minutes + 90)
        setEndTime(endDate.toTimeString().slice(0, 5))
        setUsedNovaSuggestion(true)
      }
    }
  }, [isOpen, title, suggestedTime, userPreferences, startTime])

  // Update times when defaultStartTime changes
  useEffect(() => {
    if (defaultStartTime) {
      setStartTime(defaultStartTime)
    }
    if (defaultEndTime) {
      setEndTime(defaultEndTime)
    }
  }, [defaultStartTime, defaultEndTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || isCreating) return

    try {
      // Calculate duration in minutes
      const startMinutes = startTime.split(':').reduce((acc, time) => (60 * parseInt(acc) + parseInt(time)))
      const endMinutes = endTime.split(':').reduce((acc, time) => (60 * parseInt(acc) + parseInt(time)))
      const duration = endMinutes - startMinutes

      await createStop.mutateAsync({
        plan_id: planId,
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration > 0 ? duration : 60,
        estimated_cost_per_person: estimatedCost ? parseFloat(estimatedCost) : undefined,
      })
      
      // Reset form and close
      handleClose()
    } catch (error) {
      // Error handling is done in the hook
      console.error('Error creating stop:', error)
    }
  }

  const handleClose = () => {
    if (isCreating) return
    
    setTitle('')
    setDescription('')
    setStartTime(defaultStartTime)
    setEndTime(defaultEndTime)
    setEstimatedCost('')
    setUsedNovaSuggestion(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Add Stop
          </DialogTitle>
          <DialogDescription>
            Add a new stop to your plan with details like timing and estimated cost.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Stop Name *</Label>
            <Input
              id="title"
              placeholder="e.g., Dinner at Rosemary's"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional details about this stop..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isCreating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Start Time
                {usedNovaSuggestion && (
                  <NovaIndicator 
                    show={true}
                    confidence={0.8} 
                    reason="Optimal timing for venue type"
                  />
                )}
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  setUsedNovaSuggestion(false) // Clear Nova indicator on manual change
                }}
                required
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                End Time
              </Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                disabled={isCreating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Est. Cost per Person
            </Label>
            <Input
              id="cost"
              type="number"
              placeholder="0.00"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              min="0"
              step="0.01"
              disabled={isCreating}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || isCreating}
            >
              {isCreating ? 'Adding...' : 'Add Stop'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
