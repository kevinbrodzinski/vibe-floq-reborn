export const planStatusConfig = {
  draft: {
    label: 'Draft',
    className: 'bg-muted/50 text-muted-foreground border-muted'
  },
  active: {
    label: 'Planning',
    className: 'bg-primary/10 text-primary border-primary/30'
  },
  voting: {
    label: 'Voting',
    className: 'bg-warning/10 text-warning border-warning/30'
  },
  finalized: {
    label: 'Finalized',
    className: 'bg-success/10 text-success border-success/30'
  },
  executing: {
    label: 'Live',
    className: 'bg-gradient-primary text-primary-foreground border-primary glow-primary'
  }
} as const;

export type PlanStatus = keyof typeof planStatusConfig;