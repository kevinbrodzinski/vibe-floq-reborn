interface PlanStatusTagProps {
  status: 'draft' | 'active' | 'voting' | 'finalized' | 'executing';
  className?: string;
}

export const PlanStatusTag = ({ status, className = "" }: PlanStatusTagProps) => {
  const statusConfig = {
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
  };

  const config = statusConfig[status];

  return (
    <span className={`
      inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
      transition-all duration-300 ${config.className} ${className}
    `}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {config.label}
    </span>
  );
};