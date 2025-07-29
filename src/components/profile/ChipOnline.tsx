import { cn } from '@/lib/utils';

interface ChipOnlineProps {
  className?: string;
}

export const ChipOnline = ({ className }: ChipOnlineProps) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20',
        'text-xs font-medium text-green-300',
        className
      )}
    >
      <span className="block h-1.5 w-1.5 rounded-full bg-green-300" />
      online
    </div>
  );
};