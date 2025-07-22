
import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { zIndex } from '@/constants/z';

export function GenericOverlay({
  message,
  icon = <Sparkles className="h-5 w-5 text-primary" />,
  duration = 2000,
  className = ''
}: {
  message: string;
  icon?: React.ReactNode;
  duration?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timeout);
  }, [duration]);

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      {...zIndex('modal')}
    >
      <div
        className={cn(
          'bg-card border border-border rounded-xl px-6 py-4 flex items-center gap-3 shadow-xl animate-fade-in',
          className
        )}
      >
        {icon}
        <span className="text-lg font-medium text-foreground">{message}</span>
      </div>
    </div>
  );
}

export function TimeProgressBar({
  progress,
  label = 'Progress'
}: {
  progress: number;
  label?: string;
}) {
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="relative w-full h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function CheckInStatusBadge({
  checkedIn = false
}: {
  checkedIn?: boolean;
}) {
  return (
    <div
      className={cn(
        'text-xs font-medium px-2 py-1 rounded-full border transition-colors duration-200',
        checkedIn
          ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
          : 'bg-muted text-muted-foreground border-muted-foreground/20'
      )}
    >
      {checkedIn ? 'Checked In' : 'Not Checked In'}
    </div>
  );
}

export function LoadingOverlay({
  label = 'Processing...',
  variant = 'default'
}: {
  label?: string;
  variant?: 'default' | 'minimal';
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center',
        variant === 'minimal' ? 'bg-transparent' : 'bg-black/50 backdrop-blur-sm'
      )}
      {...zIndex('modal')}
    >
      <div className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl shadow-xl">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
