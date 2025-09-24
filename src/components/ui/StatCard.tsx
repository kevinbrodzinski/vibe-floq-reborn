import { cn } from '@/lib/utils';

type StatCardProps = { 
  label: string; 
  value: string; 
  className?: string; 
};

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl bg-foreground/5 border border-foreground/10 p-3', className)}>
      <div className="text-xs text-foreground/70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}