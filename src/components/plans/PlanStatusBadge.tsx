import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Play, Pencil, CheckCircle, Archive, Clock } from 'lucide-react'
import { planStatusConfig, type PlanStatus } from '@/lib/planStatusConfig'

interface PlanStatusBadgeProps {
  status: string
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
  const getStatusConfig = (status: string) => {
    // Use the centralized status config if available
    if (status in planStatusConfig) {
      const config = planStatusConfig[status as PlanStatus]
      return {
        className: config.className,
        label: config.label,
        icon: getStatusIcon(status),
      }
    }

    // Fallback for unknown statuses
    switch (status) {
      case 'executing':
        return {
          className: 'bg-gradient-primary text-primary-foreground border-primary glow-primary',
          icon: Play,
          label: 'Live'
        }
      case 'finalized':
        return {
          className: 'bg-success/10 text-success border-success/30',
          icon: CheckCircle,
          label: 'Finalized'
        }
      case 'draft':
        return {
          className: 'bg-muted/50 text-muted-foreground border-muted',
          icon: Pencil,
          label: 'Draft'
        }
      case 'completed':
        return {
          className: 'bg-muted text-muted-foreground border-muted',
          icon: CheckCircle,
          label: 'Completed'
        }
      case 'cancelled':
        return {
          className: 'bg-destructive/10 text-destructive border-destructive/30',
          icon: Archive,
          label: 'Cancelled'
        }
      default:
        return {
          className: 'bg-muted text-muted-foreground border-muted',
          icon: Clock,
          label: status.charAt(0).toUpperCase() + status.slice(1)
        }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executing': return Play
      case 'finalized': return CheckCircle
      case 'draft': return Pencil
      case 'completed': return CheckCircle
      case 'cancelled': return Archive
      default: return Clock
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
        'border font-medium transition-all duration-200',
        config.className,
        sizeClasses[size],
        withAnimation && 'animate-fade-in',
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