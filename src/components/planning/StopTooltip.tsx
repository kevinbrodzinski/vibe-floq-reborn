import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'

interface StopTooltipProps {
  id?: string
  timeRange: string
  isVisible: boolean
  duration?: number
}

export function StopTooltip({ id, timeRange, isVisible, duration }: StopTooltipProps) {
  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -5, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.9 }}
      id={id}
      className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap z-30"
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25
      }}
    >
      <Clock className="w-3 h-3 inline mr-1" />
      {timeRange}
      {duration && (
        <span className="ml-1 opacity-70">({duration}min)</span>
      )}
      {/* Tooltip arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-foreground" />
    </motion.div>
  )
}