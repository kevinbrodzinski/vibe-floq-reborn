import { CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  hasConflict: boolean;          // ← TRUE  = conflict(s) exist
  className?: string;
}

export const StatusBadge = ({ hasConflict, className = '' }: Props) => {
  const color = hasConflict
    ? { bg: 'bg-red-500/10', border: 'border-red-500/50', text: 'text-red-400' }
    : { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400' };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
        color.bg, color.border, color.text, className
      )}
      aria-live="polite"
    >
      {hasConflict ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <CheckCircle   className="w-3 h-3" />
      )}
      <span>{hasConflict ? 'Time overlap!' : 'No conflicts'}</span>
    </div>
  );
};