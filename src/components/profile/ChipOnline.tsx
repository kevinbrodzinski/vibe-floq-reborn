import { cn } from '@/lib/utils';

interface ChipOnlineProps {
  isOnline: boolean;
  lastSeen?: string | null;
  className?: string;
}

export const ChipOnline = ({ isOnline, lastSeen, className }: ChipOnlineProps) => {
  const formatLastSeen = (timestamp: string | null) => {
    if (!timestamp) return 'Offline';
    try {
      return `Last seen ${new Date(timestamp).toLocaleString()}`;
    } catch {
      return 'Offline';
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-xs font-medium',
        isOnline 
          ? 'bg-green-500/20 text-green-300'
          : 'bg-muted/20 text-muted-foreground',
        className
      )}
      title={
        isOnline
          ? 'User is currently online'
          : formatLastSeen(lastSeen)
      }
    >
      <span 
        className={cn(
          'block h-1.5 w-1.5 rounded-full',
          isOnline ? 'bg-green-300' : 'bg-muted-foreground'
        )} 
      />
      {isOnline ? 'online' : 'offline'}
    </div>
  );
};