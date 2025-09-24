import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SmartSuggestionsToggle } from './SmartSuggestionsToggle'
import { NovaIndicator } from './NovaIndicator'
import { RefreshCw, Loader } from 'lucide-react'

interface NetworkRecoveryProps {
  isOffline: boolean
  isRetrying: boolean
  retryCount: number
  maxRetries: number
  onRetry: () => void
}

export function NetworkRecovery({ 
  isOffline, 
  isRetrying, 
  retryCount, 
  maxRetries,
  onRetry 
}: NetworkRecoveryProps) {
  if (!isOffline) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium">
            Connection lost
          </span>
          {isRetrying && (
            <div className="flex items-center gap-1 text-xs">
              <Loader className="w-3 h-3 animate-spin" />
              Retrying... ({retryCount}/{maxRetries})
            </div>
          )}
        </div>
        
        {!isRetrying && retryCount < maxRetries && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
      
      {retryCount >= maxRetries && (
        <p className="text-xs mt-2 opacity-80">
          Please check your connection and refresh the page
        </p>
      )}
    </motion.div>
  )
}