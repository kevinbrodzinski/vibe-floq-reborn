import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Edit3, Search, Sparkles } from 'lucide-react'
import { CustomStopForm } from './CustomStopForm'
import { VenueSearchModal } from './VenueSearchModal'
import { AISuggestionModal } from './AISuggestionModal'

interface AddStopModeSelectorProps {
  isOpen: boolean
  onClose: () => void
  planId: string
  timeSlot: string
}

type AddStopMode = 'selector' | 'custom' | 'venue' | 'ai'

export function AddStopModeSelector({ 
  isOpen, 
  onClose, 
  planId, 
  timeSlot 
}: AddStopModeSelectorProps) {
  const [mode, setMode] = useState<AddStopMode>('selector')

  const formatTimeSlot = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const handleClose = () => {
    setMode('selector')
    onClose()
  }

  const handleModeSelect = (selectedMode: AddStopMode) => {
    setMode(selectedMode)
  }

  const handleBack = () => {
    setMode('selector')
  }

  // Calculate default end time (1 hour later)
  const defaultEndTime = (() => {
    const [hours, minutes] = timeSlot.split(':')
    const nextHour = (parseInt(hours) + 1).toString().padStart(2, '0')
    return `${nextHour}:${minutes}`
  })()

  if (mode === 'custom') {
    return (
      <CustomStopForm
        isOpen={isOpen}
        onClose={handleClose}
        onBack={handleBack}
        planId={planId}
        defaultStartTime={timeSlot}
        defaultEndTime={defaultEndTime}
      />
    )
  }

  if (mode === 'venue') {
    return (
      <VenueSearchModal
        isOpen={isOpen}
        onClose={handleClose}
        onBack={handleBack}
        planId={planId}
        timeSlot={timeSlot}
        defaultEndTime={defaultEndTime}
      />
    )
  }

  if (mode === 'ai') {
    return (
      <AISuggestionModal
        isOpen={isOpen}
        onClose={handleClose}
        onBack={handleBack}
        planId={planId}
        timeSlot={timeSlot}
        defaultEndTime={defaultEndTime}
      />
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="max-h-[80vh]">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-center">
            Add Stop at {formatTimeSlot(timeSlot)}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          <Button
            onClick={() => handleModeSelect('custom')}
            variant="outline"
            className="w-full h-16 flex flex-col gap-2 hover:bg-primary/5"
          >
            <Edit3 className="h-5 w-5" />
            <div className="text-center">
              <div className="font-medium">Add Custom Stop</div>
              <div className="text-xs text-muted-foreground">Create your own activity</div>
            </div>
          </Button>

          <Button
            onClick={() => handleModeSelect('venue')}
            variant="outline"
            className="w-full h-16 flex flex-col gap-2 hover:bg-primary/5"
          >
            <Search className="h-5 w-5" />
            <div className="text-center">
              <div className="font-medium">Search Venues</div>
              <div className="text-xs text-muted-foreground">Find restaurants, bars & activities</div>
            </div>
          </Button>

          <Button
            onClick={() => handleModeSelect('ai')}
            variant="outline"
            className="w-full h-16 flex flex-col gap-2 hover:bg-primary/5"
          >
            <Sparkles className="h-5 w-5" />
            <div className="text-center">
              <div className="font-medium">AI Suggestion</div>
              <div className="text-xs text-muted-foreground">Get personalized recommendations</div>
            </div>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}