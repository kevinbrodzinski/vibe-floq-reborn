import { motion, AnimatePresence } from 'framer-motion'
import { Users, Edit3, Move, Maximize2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useStopEditingPresence, type StopEditingPresence } from '@/hooks/useStopEditingPresence'

interface StopEditingIndicatorsProps {
  planId: string
  stopId: string
  enabled?: boolean
}

export function StopEditingIndicators({ planId, stopId, enabled = true }: StopEditingIndicatorsProps) {
  const { getEditorsForStop } = useStopEditingPresence({ planId, enabled })
  const editors = getEditorsForStop(stopId)

  if (editors.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute -top-2 -right-2 z-20"
    >
      <AnimatePresence mode="popLayout">
        {editors.map((editor) => (
          <EditingIndicator key={`${editor.userId}_${editor.action}`} editor={editor} />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

interface EditingIndicatorProps {
  editor: StopEditingPresence
}

function EditingIndicator({ editor }: EditingIndicatorProps) {
  const getActionIcon = () => {
    switch (editor.action) {
      case 'editing':
        return <Edit3 className="w-3 h-3" />
      case 'dragging':
        return <Move className="w-3 h-3" />
      case 'resizing':
        return <Maximize2 className="w-3 h-3" />
      default:
        return <Users className="w-3 h-3" />
    }
  }

  const getActionColor = () => {
    switch (editor.action) {
      case 'editing':
        return 'bg-blue-500'
      case 'dragging':
        return 'bg-purple-500'
      case 'resizing':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getActionText = () => {
    switch (editor.action) {
      case 'editing':
        return 'editing'
      case 'dragging':
        return 'moving'
      case 'resizing':
        return 'resizing'
      default:
        return 'viewing'
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: 20 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30
      }}
      className="mb-1"
    >
      <Badge 
        variant="secondary" 
        className={`${getActionColor()} text-white border-0 shadow-md animate-pulse`}
      >
        {getActionIcon()}
        <span className="ml-1 text-xs">
          {editor.username} {getActionText()}
        </span>
      </Badge>
    </motion.div>
  )
}

interface MultiUserConflictResolverProps {
  planId: string
  conflictingStopIds: string[]
  onResolve: (resolution: 'merge' | 'overwrite' | 'split') => void
}

export function MultiUserConflictResolver({ 
  planId, 
  conflictingStopIds, 
  onResolve 
}: MultiUserConflictResolverProps) {
  const { editingPresences } = useStopEditingPresence({ planId })
  
  const conflictingEditors = editingPresences.filter(presence => 
    conflictingStopIds.includes(presence.stopId)
  )

  if (conflictingEditors.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-yellow-600" />
        <h4 className="font-medium text-yellow-800">Multiple editors detected</h4>
      </div>
      
      <p className="text-sm text-yellow-700 mb-3">
        {conflictingEditors.length} people are editing conflicting stops simultaneously.
      </p>
      
      <div className="space-y-2">
        {conflictingEditors.map((editor) => (
          <div key={`${editor.userId}_${editor.stopId}`} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{editor.username}</span>
            <span className="text-yellow-600">({editor.action})</span>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onResolve('merge')}
          className="flex-1 px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
        >
          Auto-merge
        </button>
        <button
          onClick={() => onResolve('split')}
          className="flex-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
        >
          Split timeline
        </button>
        <button
          onClick={() => onResolve('overwrite')}
          className="flex-1 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Take control
        </button>
      </div>
    </motion.div>
  )
}