import { motion } from 'framer-motion'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StopOverlayHintProps {
  type: 'conflict' | 'snap'
  message: string
  className?: string
}

export function StopOverlayHint({ type, message, className }: StopOverlayHintProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={cn(
        'absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm',
        type === 'conflict' && 'bg-destructive/90 text-destructive-foreground',
        type === 'snap' && 'bg-yellow-500/90 text-white',
        className
      )}
    >
      {type === 'conflict' ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Sparkles className="w-3 h-3" />
      )}
      <span>{message}</span>
    </motion.div>
  )
}