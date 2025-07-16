import { motion } from 'framer-motion'

interface StopOverlayHintProps {
  type: 'conflict' | 'snap'
  message: string
  className?: string
}

export function StopOverlayHint({ type, message, className }: StopOverlayHintProps) {
  const colors = {
    conflict: 'bg-destructive/90 text-destructive-foreground',
    snap: 'bg-warning/90 text-warning-foreground'
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`absolute -top-2 left-1/2 -translate-x-1/2 z-50 text-xs font-medium px-3 py-1 rounded-lg shadow-lg whitespace-nowrap ${colors[type]} ${className}`}
    >
      {message}
    </motion.div>
  )
}