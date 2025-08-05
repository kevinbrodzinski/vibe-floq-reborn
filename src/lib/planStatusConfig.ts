import { Play, Pencil, CheckCircle, Archive, Flag, Clock } from 'lucide-react'
import { safePlanStatus } from '@/types/enums/planStatus';

export const planStatusConfig = {
  draft: {
    label: 'Draft',
    className: 'bg-muted/50 text-muted-foreground border-muted',
    icon: Pencil
  },
  active: {
    label: 'Active',
    className: 'bg-primary/10 text-primary border-primary/30',
    icon: Play
  },
  closed: {
    label: 'Closed',
    className: 'bg-muted text-muted-foreground border-muted',
    icon: Archive
  },
  finalized: {
    label: 'Finalized',
    className: 'bg-success/10 text-success border-success/30',
    icon: Flag
  },
  executing: {
    label: 'Live',
    className: 'bg-gradient-primary text-primary-foreground border-primary glow-primary',
    icon: Play
  },
  completed: {
    label: 'Completed',
    className: 'bg-muted text-muted-foreground border-muted',
    icon: CheckCircle
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
    icon: Archive
  },
  invited: {
    label: 'Invited',
    className: 'bg-info/10 text-info border-info/30',
    icon: Clock
  }
} as const;

// Re-export PlanStatus type for backward compatibility 
export type PlanStatus = keyof typeof planStatusConfig;

// Default configuration for unknown statuses
export const defaultStatusConfig = {
  label: 'Unknown',
  className: 'bg-muted text-muted-foreground border-muted',
  icon: Clock
} as const;

// Utility function for consistent status badge props
export function getStatusBadgeProps(status: string) {
  const normalizedStatus = safePlanStatus(status);
  
  if (normalizedStatus in planStatusConfig) {
    return planStatusConfig[normalizedStatus];
  }
  
  return {
    ...defaultStatusConfig,
    label: status.charAt(0).toUpperCase() + status.slice(1)
  };
}

// Centralized utility for safe status handling
export function getSafeStatus(status: string | undefined): PlanStatus {
  return status as PlanStatus || 'draft';
}