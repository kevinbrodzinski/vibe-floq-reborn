import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatPillProps {
  value: string | number;
  label: string;
  icon: LucideIcon;
  className?: string;
}

export const StatPill = ({ value, label, icon: Icon, className }: StatPillProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/5',
        className
      )}
    >
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 text-white/80" />
        <span className="text-sm font-medium text-white">{value}</span>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
};