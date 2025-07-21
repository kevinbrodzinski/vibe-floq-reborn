import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Clock, MapPin, DollarSign, Sparkles } from 'lucide-react'
import { useCollaborativeState } from '@/hooks/useCollaborativeState'
import { useSmartTimeSuggestion } from '@/hooks/useSmartTimeSuggestion'
import { usePlanStops } from '@/hooks/usePlanStops'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { NovaIndicator } from './NovaIndicator'
import type { PlanStop } from '@/types/plan'

interface CustomStopFormProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  planId: string
  defaultStartTime: string
  defaultEndTime: string
}

export function CustomStopForm({ 
  isOpen, 
  onClose, 
  onBack,
  planId, 
  defaultStartTime,
  defaultEndTime
}: CustomStopFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState(defaultStartTime)
  const [endTime, setEndTime] = useState(defaultEndTime)
  const [estimatedCost, setEstimatedCost] = useState('')
  const [usedNovaSuggestion, setUsedNovaSuggestion] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { addStop } = useCollaborativeState(planId)
  const { data: existingStops } = usePlanStops(planId)
  const { data: userPreferences } = useUserPreferences()
  
  // Note: AI suggestion functionality will be implemented later
  const suggestion = null
  const suggestionLoading = false
  const generateSuggestion = async (params: any) => {}
  const applySuggestion = (params: any) => {}
  const clearSuggestion = () => {}

  useEffect(() => {
    setStartTime(defaultStartTime)
    setEndTime(defaultEndTime)
  }, [defaultStartTime, defaultEndTime])

  const formatTimeSlot = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      const newStop: PlanStop = {
        id: '', // Will be set by the backend
        plan_id: planId,
        title: title.trim(),
        description: description.trim() || '',
        startTime: startTime,
        endTime: endTime,
        start_time: startTime,
        end_time: endTime,
        location: '',
        venue: '',
        address: '',
        vibeMatch: 0.8,
        status: 'confirmed' as const,
        color: '#3B82F6',
        stop_order: (existingStops?.length || 0) + 1,
        createdBy: '',
        participants: [],
        votes: [],
        kind: 'custom' as any
      }

      await addStop(newStop)
      
      // Reset form
      setTitle('')
      setDescription('')
      setEstimatedCost('')
      setUsedNovaSuggestion(false)
      clearSuggestion()
      onClose()
    } catch (error) {
      console.error('Failed to add stop:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGetSuggestion = async () => {
    if (!title.trim()) return
    
    await generateSuggestion({
      activityType: title,
      timeSlot: `${startTime}-${endTime}`,
      userPreferences: userPreferences?.preferred_vibe,
      existingStops: existingStops?.map(s => s.title) || []
    })
  }

  const handleUseSuggestion = () => {
    if (!suggestion) return
    
    applySuggestion({
      onApply: (data) => {
        if (data.title) setTitle(data.title)
        if (data.description) setDescription(data.description)
        if (data.estimatedCost) setEstimatedCost(data.estimatedCost.toString())
        setUsedNovaSuggestion(true)
      }
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SheetTitle>
              Add Custom Stop at {formatTimeSlot(defaultStartTime)}
            </SheetTitle>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor="title">Activity Name</Label>
            <div className="flex gap-2">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Dinner at The Local"
                required
                className="flex-1"
              />
              {title.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetSuggestion}
                  disabled={suggestionLoading}
                  className="shrink-0"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {suggestion && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <NovaIndicator show={true} />
                  <span className="text-sm font-medium">AI Suggestion</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUseSuggestion}
                  disabled={isSubmitting}
                >
                  Use Suggestion
                </Button>
              </div>
              
              <div className="space-y-2 text-sm">
                {suggestion.title && (
                  <p><strong>Title:</strong> {suggestion.title}</p>
                )}
                {suggestion.description && (
                  <p><strong>Description:</strong> {suggestion.description}</p>
                )}
                {suggestion.estimatedCost && (
                  <p><strong>Estimated Cost:</strong> ${suggestion.estimatedCost}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes or details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">
                <Clock className="h-4 w-4 inline mr-1" />
                Start Time
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedCost">
              <DollarSign className="h-4 w-4 inline mr-1" />
              Estimated Cost (Optional)
            </Label>
            <Input
              id="estimatedCost"
              type="number"
              step="0.01"
              min="0"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Adding...' : 'Add Stop'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}