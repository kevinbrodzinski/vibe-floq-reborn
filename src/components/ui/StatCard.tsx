import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  className?: string;
}

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div className={cn(
      "min-w-[120px] rounded-lg border p-3",
      "border-[color:var(--border)] bg-[color:var(--bg-alt)]",
      className
    )}>
      <div className="text-[12px] text-[color:var(--sub-ink)]">{label}</div>
      <div className="mt-1 text-[20px] font-semibold text-[color:var(--ink)]">{value}</div>
    </div>
  );
}