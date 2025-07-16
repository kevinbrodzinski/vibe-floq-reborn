import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCreatePlanStop } from '@/hooks/useCreatePlanStop'
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

  const createStop = useCreatePlanStop()
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
    if (isOpen && title && userPreferences?.feedback_sentiment?.prefer_suggestions !== false) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) return

    try {
      await createStop.mutateAsync({
        plan_id: planId,
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startTime,
        end_time: endTime,
        estimated_cost_per_person: estimatedCost ? parseFloat(estimatedCost) : undefined,
      })
      
      // Reset form
      setTitle('')
      setDescription('')
      setStartTime(defaultStartTime)
      setEndTime(defaultEndTime)
      setEstimatedCost('')
      onClose()
    } catch (error) {
      console.error('Error creating stop:', error)
    }
  }

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setStartTime(defaultStartTime)
    setEndTime(defaultEndTime)
    setEstimatedCost('')
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
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || createStop.isPending}
            >
              {createStop.isPending ? 'Adding...' : 'Add Stop'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}