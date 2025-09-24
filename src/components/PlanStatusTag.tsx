import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PlanStatus = string;

interface PlanStatusTagProps {
  status: PlanStatus;
  className?: string;
}

const MAP: Record<string, { label: string; variant: 'secondary'|'default'|'destructive'|'outline' }> = {
  draft:    { label: 'Draft',    variant: 'outline'     },
  active:   { label: 'Active',   variant: 'default'     },
  pending:  { label: 'Pending',  variant: 'secondary'   },
  canceled: { label: 'Canceled', variant: 'destructive' }
};

export function PlanStatusTag({ status, className = '' }: PlanStatusTagProps) {
  const m = MAP[status] ?? { label: 'Unknown', variant: 'secondary' };
  return (
    <Badge 
      variant={m.variant} 
      className={cn('px-2.5 py-1', className)}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {m.label}
    </Badge>
  );
}