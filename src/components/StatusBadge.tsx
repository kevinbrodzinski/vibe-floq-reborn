import { CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  hasConflict: boolean;          // ← TRUE  = conflict(s) exist
  className?: string;
}

export const StatusBadge = ({ hasConflict, className = '' }: Props) => {
  const textColor = hasConflict ? 'text-red-400' : 'text-green-400';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        textColor,
        className
      )}
      aria-live="polite"
    >
      {hasConflict ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <CheckCircle className="w-3 h-3" />
      )}
      <span>{hasConflict ? 'Time overlap!' : 'No conflicts'}</span>
    </div>
  );
};