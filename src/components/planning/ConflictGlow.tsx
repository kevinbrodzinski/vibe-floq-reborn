import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface ConflictGlowProps {
  isConflicting: boolean
  message?: string
}

export function ConflictGlow({ isConflicting, message }: ConflictGlowProps) {
  if (!isConflicting) return null

  return (
    <motion.div
      layoutId="conflict-glow"
      className="absolute inset-0 rounded-2xl border-2 border-destructive/60 bg-destructive/5 pointer-events-none z-10"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        boxShadow: '0 0 20px hsl(var(--destructive) / 0.3)'
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        type: 'spring',
        stiffness: 300,
        damping: 25,
        opacity: { duration: 0.2 }
      }}
    >
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
        >
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          {message}
        </motion.div>
      )}
    </motion.div>
  )
}