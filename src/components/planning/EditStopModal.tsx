import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useUpdatePlanStop } from '@/hooks/useUpdatePlanStop'
import { useDeletePlanStop } from '@/hooks/useDeletePlanStop'
import { Clock, MapPin, DollarSign, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface EditStopModalProps {
  isOpen: boolean
  onClose: () => void
  stop: {
    id: string
    plan_id: string
    title: string
    description?: string
    start_time: string
    end_time: string
    estimated_cost_per_person?: number
    venue?: {
      id: string
      name: string
    }
  } | null
}

export function EditStopModal({ isOpen, onClose, stop }: EditStopModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')

  const updateStop = useUpdatePlanStop()
  const deleteStop = useDeletePlanStop()

  useEffect(() => {
    if (stop) {
      setTitle(stop.title)
      setDescription(stop.description || '')
      setStartTime(stop.start_time)
      setEndTime(stop.end_time)
      setEstimatedCost(stop.estimated_cost_per_person?.toString() || '')
    }
  }, [stop])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stop || !title.trim()) return

    try {
      await updateStop.mutateAsync({
        id: stop.id,
        plan_id: stop.plan_id,
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startTime,
        end_time: endTime,
        estimated_cost_per_person: estimatedCost ? parseFloat(estimatedCost) : undefined,
      })
      
      onClose()
    } catch (error) {
      console.error('Error updating stop:', error)
    }
  }

  const handleDelete = async () => {
    if (!stop) return

    try {
      await deleteStop.mutateAsync({
        id: stop.id,
        plan_id: stop.plan_id,
      })
      
      onClose()
    } catch (error) {
      console.error('Error deleting stop:', error)
    }
  }

  const handleClose = () => {
    if (stop) {
      setTitle(stop.title)
      setDescription(stop.description || '')
      setStartTime(stop.start_time)
      setEndTime(stop.end_time)
      setEstimatedCost(stop.estimated_cost_per_person?.toString() || '')
    }
    onClose()
  }

  if (!stop) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Edit Stop
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Stop Name *</Label>
            <Input
              id="title"
              placeholder="e.g., Dinner at Rosemary's"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {stop.venue && (
            <div className="p-3 bg-muted rounded-md">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">{stop.venue.name}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional details about this stop..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Start Time
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                End Time
              </Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Est. Cost per Person
            </Label>
            <Input
              id="cost"
              type="number"
              placeholder="0.00"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Stop
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Stop</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{stop.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!title.trim() || updateStop.isPending}
                className="flex-1 sm:flex-none"
              >
                {updateStop.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}