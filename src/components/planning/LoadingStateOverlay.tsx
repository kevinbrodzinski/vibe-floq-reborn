import { motion } from 'framer-motion'
import { LoadingOverlay } from '@/components/LoadingStates'

interface LoadingStateOverlayProps {
  loadingState: 'idle' | 'adding' | 'reordering' | 'deleting'
  children: React.ReactNode
}

export const LoadingStateOverlay = ({ loadingState, children }: LoadingStateOverlayProps) => {
  const loadingMessages = {
    adding: 'Adding stop...',
    reordering: 'Reordering timeline...',
    deleting: 'Removing stop...',
    idle: ''
  }

  return (
    <LoadingOverlay loading={loadingState !== 'idle'}>
      {children}
      {loadingState !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-50"
        >
          <div className="bg-card p-4 rounded-lg shadow-lg border">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm font-medium">
                {loadingMessages[loadingState]}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </LoadingOverlay>
  )
}