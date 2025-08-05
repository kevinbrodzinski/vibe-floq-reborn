import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface SnapSuggestionOverlayProps {
  show: boolean
  suggestion?: {
    startTime: string
    endTime: string
    confidence: number
    reason?: string
  }
}

export function SnapSuggestionOverlay({ show, suggestion }: SnapSuggestionOverlayProps) {
  if (!show || !suggestion) return null

  return (
    <motion.div
      layoutId="snap-suggestion"
      className="absolute inset-0 rounded-2xl border-2 border-emerald-400/60 bg-emerald-100/10 z-5 pointer-events-none"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        boxShadow: '0 0 15px hsl(142 76% 36% / 0.3)'
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        type: 'spring',
        stiffness: 260,
        damping: 20,
        opacity: { duration: 0.2 }
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
      >
        <Sparkles className="w-3 h-3 inline mr-1" />
        🪄 Suggested by Nova: {suggestion.reason || `${suggestion.startTime} - ${suggestion.endTime}`}
      </motion.div>
    </motion.div>
  )
}