
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Copy, Move, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { zIndex } from '@/constants/z'

interface BulkActionsToolbarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkDelete: () => void
  onBulkDuplicate: () => void
  onBulkMove: () => void
  onBulkReschedule: () => void
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkDuplicate,
  onBulkMove,
  onBulkReschedule
}: BulkActionsToolbarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          {...zIndex('toast')}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2"
        >
          <div className="bg-card border border-border rounded-2xl shadow-lg p-4 min-w-80">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedCount} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkMove}
                  className="gap-1"
                >
                  <Move className="w-3 h-3" />
                  Move
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkReschedule}
                  className="gap-1"
                >
                  <Clock className="w-3 h-3" />
                  Reschedule
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkDuplicate}
                  className="gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Duplicate
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBulkDelete}
                  className="gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
