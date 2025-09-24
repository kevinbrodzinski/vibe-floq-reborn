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
        'flex flex-col items-center gap-1 px-3 py-3 rounded-2xl bg-white/5 backdrop-blur-sm',
        className
      )}
    >
      <Icon className="h-4 w-4 text-purple-300" />
      <span className="text-sm font-medium text-gray-100">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
    </div>
  );
};