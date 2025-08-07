import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, Pencil } from 'lucide-react'
import type { PlanStop } from '@/types/plan'

interface StopActionsSheetProps {
  stop: PlanStop
  open: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function StopActionsSheet({
  stop,
  open,
  onClose,
  onEdit,
  onDelete,
}: StopActionsSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[280px] p-4">
        <DialogHeader>
          <DialogTitle>{stop.title}</DialogTitle>
        </DialogHeader>

        <Button
          variant="ghost"
          className="gap-2 w-full mb-1"
          onClick={() => {
            onEdit()
            onClose()
          }}
        >
          <Pencil className="w-4 h-4" />
          Edit stop
        </Button>

        <Button
          variant="destructive"
          className="gap-2 w-full"
          onClick={() => {
            onDelete()
            onClose()
          }}
        >
          <Trash2 className="w-4 h-4" />
          Delete stop
        </Button>
      </DialogContent>
    </Dialog>
  )
}