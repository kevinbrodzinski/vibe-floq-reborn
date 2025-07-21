import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Edit3, Search, Sparkles } from 'lucide-react'
import { trackEvent, triggerHaptic } from '@/lib/analytics'
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
    // Haptic feedback for mobile
    triggerHaptic('light')
    
    // Track mode selection for analytics
    trackEvent('stop_mode_selected', {
      mode: selectedMode,
      plan_id: planId,
      time_slot: timeSlot
    })
    
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

  if (mode !== 'selector') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {mode === 'custom' && (
            <CustomStopForm
              isOpen={isOpen}
              onClose={handleClose}
              onBack={handleBack}
              planId={planId}
              defaultStartTime={timeSlot}
              defaultEndTime={defaultEndTime}
            />
          )}
          {mode === 'venue' && (
            <VenueSearchModal
              isOpen={isOpen}
              onClose={handleClose}
              onBack={handleBack}
              planId={planId}
              timeSlot={timeSlot}
              defaultEndTime={defaultEndTime}
            />
          )}
          {mode === 'ai' && (
            <AISuggestionModal
              isOpen={isOpen}
              onClose={handleClose}
              onBack={handleBack}
              planId={planId}
              timeSlot={timeSlot}
              defaultEndTime={defaultEndTime}
            />
          )}
        </motion.div>
      </AnimatePresence>
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

        <motion.div 
          className="space-y-4 pb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, staggerChildren: 0.1 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
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
          </motion.div>
        </motion.div>
      </SheetContent>
    </Sheet>
  )
}

// Component display name for debugging
AddStopModeSelector.displayName = 'AddStopModeSelector'