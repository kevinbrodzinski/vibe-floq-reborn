import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StopActivityBubbleProps {
  message: string
  type?: 'vote' | 'update' | 'join' | 'leave'
  className?: string
}

export function StopActivityBubble({ 
  message, 
  type = 'update',
  className 
}: StopActivityBubbleProps) {
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'vote':
        return 'bg-primary/90 text-primary-foreground'
      case 'join':
        return 'bg-green-500/90 text-white'
      case 'leave':
        return 'bg-gray-500/90 text-white'
      default:
        return 'bg-card/90 text-foreground'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'absolute top-0 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm',
        getTypeStyles(type),
        className
      )}
    >
      {message}
    </motion.div>
  )
}