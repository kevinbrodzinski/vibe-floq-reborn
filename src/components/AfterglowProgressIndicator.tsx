import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressData {
  step: string
  progress: number
  status: 'in_progress' | 'completed' | 'error'
  message?: string
}

interface AfterglowProgressIndicatorProps {
  progress: ProgressData
  className?: string
}

export const AfterglowProgressIndicator: React.FC<AfterglowProgressIndicatorProps> = ({
  progress,
  className
}) => {
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />
      default:
        return <Sparkles className="h-5 w-5 text-primary animate-pulse" />
    }
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'text-green-500'
      case 'error':
        return 'text-destructive'
      default:
        return 'text-primary'
    }
  }

  return (
    <div className={cn('space-y-4 p-6 bg-card rounded-lg border', className)}>
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <h3 className={cn('font-medium', getStatusColor())}>
            {progress.step}
          </h3>
          {progress.message && (
            <p className="text-sm text-muted-foreground mt-1">
              {progress.message}
            </p>
          )}
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          {progress.progress}%
        </div>
      </div>
      
      <Progress 
        value={progress.progress} 
        className="h-2"
        aria-label={`Progress: ${progress.progress}%`}
      />
    </div>
  )
}