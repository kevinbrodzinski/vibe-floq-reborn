import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface NovaIndicatorProps {
  show: boolean
  confidence?: number
  reason?: string
}

export function NovaIndicator({ show, confidence = 0.8, reason }: NovaIndicatorProps) {
  if (!show) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="absolute -top-2 -right-2 z-10"
    >
      <Badge 
        variant="secondary" 
        className="bg-gradient-to-r from-primary/20 to-accent/20 border-primary/40 text-primary shadow-lg"
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Nova {Math.round(confidence * 100)}%
      </Badge>
      {reason && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-popover text-popover-foreground text-xs px-2 py-1 rounded-md shadow-md whitespace-nowrap border z-20"
        >
          {reason}
        </motion.div>
      )}
    </motion.div>
  )
}