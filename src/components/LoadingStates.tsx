import { memo } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LoadingButtonProps {
  loading?: boolean
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const LoadingButton = memo(({
  loading = false,
  children,
  className,
  disabled,
  onClick,
  variant = 'default',
  size = 'default'
}: LoadingButtonProps) => {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
})

LoadingButton.displayName = 'LoadingButton'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner = memo(({ 
  size = 'md', 
  className 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }

  return (
    <Loader2 
      className={cn(
        'animate-spin',
        sizeClasses[size],
        className
      )} 
    />
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'

interface LoadingOverlayProps {
  isVisible: boolean
  children: React.ReactNode
  className?: string
}

export const LoadingOverlay = memo(({
  isVisible,
  children,
  className
}: LoadingOverlayProps) => {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isVisible && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-50">
          <LoadingSpinner size="lg" />
        </div>
      )}
    </div>
  )
})

LoadingOverlay.displayName = 'LoadingOverlay'