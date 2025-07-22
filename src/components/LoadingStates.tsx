import { memo, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Variant = ButtonProps['variant']
type Size = ButtonProps['size']

interface LoadingButtonProps extends Omit<ButtonProps, 'variant' | 'size' | 'ref'> {
  loading?: boolean
  variant?: Variant
  size?: Size
}

export const LoadingButton = memo(
  forwardRef<HTMLButtonElement, LoadingButtonProps>(
    ({
      loading = false,
      children,
      className,
      disabled,
      variant = 'default',
      size = 'default',
      ...rest
    }, ref) => (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(className)}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Button>
    )
  )
)

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
    sm: 'h-5 w-5',
    md: 'h-7 w-7', 
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
        <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
})

LoadingOverlay.displayName = 'LoadingOverlay'
