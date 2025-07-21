import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles, Clock, MapPin, DollarSign, RefreshCw } from 'lucide-react'
import { useCollaborativeState } from '@/hooks/useCollaborativeState'
import { usePlanStops } from '@/hooks/usePlanStops'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { NovaIndicator } from './NovaIndicator'
import type { PlanStop } from '@/types/plan'

interface AISuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  planId: string
  timeSlot: string
  defaultEndTime: string
}

// Mock AI suggestions - replace with actual AI service
const mockSuggestions = [
  {
    id: '1',
    title: 'Wine Tasting at Vintage Cellars',
    description: 'Experience a curated selection of local wines with expert sommelier guidance',
    category: 'Food & Drink',
    estimatedCost: 45,
    duration: '1.5 hours',
    reasoning: 'Based on your preference for sophisticated experiences and previous wine activities'
  },
  {
    id: '2',
    title: 'Rooftop Jazz Performance',
    description: 'Live jazz trio performing classic and contemporary pieces with city views',
    category: 'Entertainment',
    estimatedCost: 25,
    duration: '2 hours',
    reasoning: 'Matches your music interests and preference for evening entertainment'
  },
  {
    id: '3',
    title: 'Artisan Chocolate Workshop',
    description: 'Learn to craft your own gourmet chocolates with local artisan chocolatier',
    category: 'Workshop',
    estimatedCost: 55,
    duration: '1 hour',
    reasoning: 'Perfect for the time slot and aligns with your creative activity preferences'
  }
]

export function AISuggestionModal({ 
  isOpen, 
  onClose, 
  onBack,
  planId, 
  timeSlot,
  defaultEndTime
}: AISuggestionModalProps) {
  const [suggestions, setSuggestions] = useState(mockSuggestions)
  const [selectedSuggestion, setSelectedSuggestion] = useState<typeof mockSuggestions[0] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { addStop } = useCollaborativeState(planId)
  const { data: existingStops } = usePlanStops(planId)
  const { data: userPreferences } = useUserPreferences()

  const formatTimeSlot = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const handleGenerateNew = async () => {
    setIsGenerating(true)
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // In a real implementation, this would call your AI service
    // For now, we'll shuffle the existing suggestions
    const shuffled = [...mockSuggestions].sort(() => Math.random() - 0.5)
    setSuggestions(shuffled)
    setSelectedSuggestion(null)
    setIsGenerating(false)
  }

  const handleSuggestionSelect = (suggestion: typeof mockSuggestions[0]) => {
    setSelectedSuggestion(suggestion)
  }

  const handleAddSuggestion = async () => {
    if (!selectedSuggestion) return

    setIsSubmitting(true)
    try {
      const newStop: PlanStop = {
        id: '', // Will be set by the backend
        plan_id: planId,
        title: selectedSuggestion.title,
        description: selectedSuggestion.description,
        startTime: timeSlot,
        endTime: defaultEndTime,
        start_time: timeSlot,
        end_time: defaultEndTime,
        location: '',
        venue: selectedSuggestion.title,
        address: '',
        vibeMatch: 0.8,
        status: 'suggested' as const,
        color: '#3B82F6',
        stop_order: (existingStops?.length || 0) + 1,
        createdBy: '',
        participants: [],
        votes: [],
        kind: 'ai' as any
      }

      await addStop(newStop)
      onClose()
    } catch (error) {
      console.error('Failed to add AI suggestion:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SheetTitle className="flex items-center gap-2">
              <NovaIndicator show={true} />
              AI Suggestions for {formatTimeSlot(timeSlot)}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Generate New Button */}
          <Button
            variant="outline"
            onClick={handleGenerateNew}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating new suggestions...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate New Suggestions
              </>
            )}
          </Button>

          {/* AI Suggestions */}
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedSuggestion?.id === suggestion.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{suggestion.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {suggestion.category}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {suggestion.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${suggestion.estimatedCost}
                  </div>
                </div>

                <div className="text-xs text-primary/70 italic">
                  {suggestion.reasoning}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={handleAddSuggestion}
              disabled={!selectedSuggestion || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Adding...' : 'Add Suggestion'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}