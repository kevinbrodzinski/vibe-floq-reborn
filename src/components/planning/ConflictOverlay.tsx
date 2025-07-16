import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConflictOverlayProps {
  isVisible: boolean
  conflictType: 'time_overlap' | 'travel_impossible' | 'venue_closed'
  message: string
  suggestion?: string
  onResolve: () => void
  onDismiss: () => void
}

export function ConflictOverlay({
  isVisible,
  conflictType,
  message,
  suggestion,
  onResolve,
  onDismiss
}: ConflictOverlayProps) {
  const getConflictColor = (type: string) => {
    switch (type) {
      case 'time_overlap': return 'border-red-500 bg-red-50 dark:bg-red-950/20'
      case 'travel_impossible': return 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
      case 'venue_closed': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
      default: return 'border-red-500 bg-red-50 dark:bg-red-950/20'
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            transition: {
              type: "spring",
              damping: 25,
              stiffness: 300
            }
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.9, 
            y: -20,
            transition: {
              duration: 0.2
            }
          }}
          className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
            z-50 max-w-md p-6 rounded-2xl border-2 backdrop-blur-xl shadow-2xl
            ${getConflictColor(conflictType)}
          `}
        >
          <div className="flex items-start gap-3">
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 0],
                transition: {
                  duration: 0.5,
                  repeat: 2
                }
              }}
              className="flex-shrink-0"
            >
              <AlertTriangle className="w-6 h-6 text-current" />
            </motion.div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">
                Scheduling Conflict Detected
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {message}
              </p>
              
              {suggestion && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ delay: 0.3 }}
                  className="text-xs bg-primary/10 text-primary p-3 rounded-lg mb-4"
                >
                  <strong>Suggestion:</strong> {suggestion}
                </motion.div>
              )}
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onResolve}
                  className="flex-1"
                >
                  Auto-Resolve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDismiss}
                  className="px-3"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}