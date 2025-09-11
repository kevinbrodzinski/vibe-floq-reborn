import * as React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  show?: boolean;
  request: () => Promise<{ motionOk: boolean; micOk: boolean }>;
  onRequested?: (r: { motionOk: boolean; micOk: boolean }) => void;
  className?: string;
};

export function ImproveAccuracyChip({ show, request, onRequested, className }: Props) {
  const [busy, setBusy] = React.useState(false);
  
  if (!show) return null;

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await request();
      onRequested?.(res);
    } catch (error) {
      console.warn('Environmental permissions request failed:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
        'bg-primary/10 text-primary hover:bg-primary/20',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'min-h-[40px] flex items-center justify-center', // 44px tap target
        className
      )}
      aria-label="Improve accuracy by enabling motion and microphone"
    >
      {busy ? 'Enabling…' : 'Improve accuracy'}
    </button>
  );
}