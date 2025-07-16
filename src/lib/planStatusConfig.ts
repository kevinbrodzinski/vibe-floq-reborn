export const planStatusConfig = {
  draft: {
    label: 'Draft',
    className: 'bg-muted/50 text-muted-foreground border-muted'
  },
  finalized: {
    label: 'Finalized',
    className: 'bg-success/10 text-success border-success/30'
  },
  executing: {
    label: 'Live',
    className: 'bg-gradient-primary text-primary-foreground border-primary glow-primary'
  },
  completed: {
    label: 'Completed',
    className: 'bg-muted text-muted-foreground border-muted'
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-destructive/10 text-destructive border-destructive/30'
  }
} as const;

export type PlanStatus = keyof typeof planStatusConfig;