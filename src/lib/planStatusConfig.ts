import { Play, Pencil, CheckCircle, Archive, Flag, Clock } from 'lucide-react'

export const planStatusConfig = {
  draft: {
    label: 'Draft',
    className: 'bg-muted/50 text-muted-foreground border-muted',
    icon: Pencil
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
  }
} as const;

export type PlanStatus = keyof typeof planStatusConfig;

// Default configuration for unknown statuses
export const defaultStatusConfig = {
  label: 'Unknown',
  className: 'bg-muted text-muted-foreground border-muted',
  icon: Clock
} as const;

// Utility function for consistent status badge props
export function getStatusBadgeProps(status: string) {
  const normalizedStatus = status as PlanStatus;
  
  if (normalizedStatus in planStatusConfig) {
    return planStatusConfig[normalizedStatus];
  }
  
  return {
    ...defaultStatusConfig,
    label: status.charAt(0).toUpperCase() + status.slice(1)
  };
}