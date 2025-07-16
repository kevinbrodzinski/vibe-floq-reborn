// 4. UI: StopActivityBubble Component

import { motion } from 'framer-motion'

interface StopActivityBubbleProps {
  message: string
}

export function StopActivityBubble({ message }: StopActivityBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1 bg-card shadow rounded-full text-sm"
    >
      {message}
    </motion.div>
  )
}