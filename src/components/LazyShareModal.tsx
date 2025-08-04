import React, { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Lazy load the share modal for better performance
const ShareModal = lazy(() => import('./share/ShareModal'))

interface LazyShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  afterglow?: any // Allow any type to prevent strict type checking
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
        afterglow={afterglow || {
          id: 'temp',
          date: new Date().toISOString(),
          energy_score: 0,
          social_intensity: 0,
          dominant_vibe: 'chill',
          summary_text: '',
          total_venues: 0,
          total_floqs: 0,
          crossed_paths_count: 0,
          ai_summary: null,
          is_pinned: false,
          is_public: false,
          profile_id: '',
          created_at: new Date().toISOString(),
          ai_summary_generated_at: new Date().toISOString()
        }}
      />
    </Suspense>
  )
}