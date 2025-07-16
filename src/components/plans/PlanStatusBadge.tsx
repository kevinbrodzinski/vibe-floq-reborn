import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getStatusBadgeProps, type PlanStatus } from '@/lib/planStatusConfig'

interface PlanStatusBadgeProps {
  status: PlanStatus | string // Accept string but narrow internally
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'default' | 'lg'
  withAnimation?: boolean
}

export function PlanStatusBadge({ 
  status, 
  className, 
  showIcon = true, 
  size = 'default',
  withAnimation = false
}: PlanStatusBadgeProps) {
  // Get configuration with proper fallback handling
  const config = getStatusBadgeProps(status)
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'border font-medium transition-all duration-500 transform',
        config.className,
        sizeClasses[size],
        withAnimation && 'animate-pulse transition-all duration-300',
        'hover:scale-105', // Smooth hover animation
        className
      )}
      aria-label={`Plan status: ${config.label}`}
    >
      <div className="flex items-center gap-1">
        {showIcon && config.icon && (
          <Icon className={cn('inline', iconSizes[size])} />
        )}
        <span>{config.label}</span>
      </div>
    </Badge>
  )
}