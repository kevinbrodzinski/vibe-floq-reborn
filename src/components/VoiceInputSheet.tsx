import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, X, Loader2 } from 'lucide-react'
import { useVoiceToStop } from '@/hooks/useVoiceToStop'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface VoiceInputSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  planDate: string
}

export function VoiceInputSheet({ 
  open, 
  onOpenChange, 
  planId, 
  planDate 
}: VoiceInputSheetProps) {
  const { state, transcript, start, stop } = useVoiceToStop(planId, planDate)

  const isListening = state === 'listening'
  const isParsing = state === 'parsing' || state === 'creating'
  const isError = state === 'error'

  // Auto-start when sheet opens
  useEffect(() => {
    if (open && state === 'idle') {
      start()
    }
  }, [open, state, start])

  // Auto-close when stop is successfully created (but not on error)
  useEffect(() => {
    if (state === 'idle' && transcript && open && !isError) {
      // Add small delay before closing to show success
      setTimeout(() => onOpenChange(false), 1000)
    }
  }, [state, transcript, open, onOpenChange, isError])

  const handleClose = () => {
    stop()
    onOpenChange(false)
  }

  const getStatusText = () => {
    switch (state) {
      case 'listening':
        return 'Listening...'
      case 'parsing':
        return 'Understanding your request...'
      case 'creating':
        return 'Adding stop to your plan...'
      case 'error':
        return 'Something went wrong. Try again?'
      default:
        return 'Ready to listen'
    }
  }

  const getProgressValue = () => {
    switch (state) {
      case 'listening':
        return 25
      case 'parsing':
        return 60
      case 'creating':
        return 90
      default:
        return 0
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[400px]">
        <VisuallyHidden>
          <SheetTitle>Voice Input</SheetTitle>
        </VisuallyHidden>
        <SheetHeader className="flex flex-row items-center justify-between space-y-0">
          <h2 className="text-lg font-semibold">Voice Input</h2>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        <div className="flex flex-col items-center gap-6 mt-8">
          {/* Animated Microphone */}
          <div className="relative">
            <motion.div
              animate={{ 
                scale: isListening ? [1, 1.1, 1] : 1,
                opacity: isError ? 0.5 : 1
              }}
              transition={{ 
                repeat: isListening ? Infinity : 0, 
                duration: 1.5,
                ease: "easeInOut"
              }}
              className={`
                p-6 rounded-full transition-colors duration-300
                ${isListening ? 'bg-red-500/20 border-2 border-red-500/40' : 'bg-primary/10 border-2 border-primary/20'}
                ${isError ? 'bg-destructive/20 border-destructive/40' : ''}
              `}
            >
              {isParsing ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <Mic className={`h-8 w-8 ${isListening ? 'text-red-500' : 'text-primary'} ${isError ? 'text-destructive' : ''}`} />
              )}
            </motion.div>

            {/* Listening indicator rings */}
            {isListening && (
              <>
                <motion.div
                  animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-red-500/30"
                />
                <motion.div
                  animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute inset-0 rounded-full border-2 border-red-500/20"
                />
              </>
            )}
          </div>

          {/* Status Text */}
          <p className="text-sm text-muted-foreground text-center">
            {getStatusText()}
          </p>

          {/* Progress Bar */}
          {isParsing && (
            <div className="w-full max-w-xs">
              <Progress value={getProgressValue()} className="h-2" />
            </div>
          )}

          {/* Transcript Display */}
          <AnimatePresence>
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center max-w-sm"
              >
                <p className="text-sm text-muted-foreground mb-2">You said:</p>
                <p className="text-base font-medium bg-muted/50 rounded-lg p-3">
                  "{transcript}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Help Text */}
          {!transcript && state === 'listening' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center max-w-sm"
            >
              <p className="text-xs text-muted-foreground">
                Try saying: "Add coffee at 9am" or "Visit the museum at 2:30pm"
              </p>
            </motion.div>
          )}

          {/* Retry Button */}
          {isError && (
            <Button onClick={start} variant="outline" size="sm">
              Try Again
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}