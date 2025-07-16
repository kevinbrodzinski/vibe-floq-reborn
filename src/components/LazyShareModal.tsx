import React, { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Lazy load the share modal for better performance
const ShareModal = lazy(() => import('./share/ShareModal'))

interface LazyShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  afterglow: any
}

const ShareModalLoader = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="ml-2 text-sm text-muted-foreground">Loading share options...</span>
  </div>
)

export const LazyShareModal: React.FC<LazyShareModalProps> = ({ 
  open, 
  onOpenChange, 
  afterglow 
}) => {
  if (!open) return null

  return (
    <Suspense fallback={<ShareModalLoader />}>
      <ShareModal 
        open={open}
        onOpenChange={onOpenChange}
        afterglow={afterglow}
      />
    </Suspense>
  )
}