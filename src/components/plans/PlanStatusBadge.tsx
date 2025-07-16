import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Play, Pencil, CheckCircle, Archive } from 'lucide-react'

interface PlanStatusBadgeProps {
  status: string
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'default' | 'lg'
}

export function PlanStatusBadge({ 
  status, 
  className, 
  showIcon = true, 
  size = 'default' 
}: PlanStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'executing':
        return {
          color: 'bg-green-500/10 text-green-600 border-green-500/20',
          icon: Play,
          label: 'Executing'
        }
      case 'finalized':
        return {
          color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          icon: CheckCircle,
          label: 'Finalized'
        }
      case 'draft':
        return {
          color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
          icon: Pencil,
          label: 'Draft'
        }
      case 'completed':
        return {
          color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
          icon: CheckCircle,
          label: 'Completed'
        }
      case 'cancelled':
        return {
          color: 'bg-red-500/10 text-red-600 border-red-500/20',
          icon: Archive,
          label: 'Cancelled'
        }
      default:
        return {
          color: 'bg-muted text-muted-foreground',
          icon: Pencil,
          label: status
        }
    }
  }

  const config = getStatusConfig(status)
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
        'border font-medium',
        config.color,
        sizeClasses[size],
        className
      )}
      aria-label={`Plan status: ${config.label}`}
    >
      <div className="flex items-center gap-1">
        {showIcon && <Icon className={iconSizes[size]} />}
        <span>{config.label}</span>
      </div>
    </Badge>
  )
}