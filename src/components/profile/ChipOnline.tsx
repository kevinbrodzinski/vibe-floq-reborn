import { cn } from '@/lib/utils';

interface ChipOnlineProps {
  className?: string;
}

export const ChipOnline = ({ className }: ChipOnlineProps) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/40',
        className
      )}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      <span className="text-xs text-green-300 font-medium">Online</span>
    </div>
  );
};