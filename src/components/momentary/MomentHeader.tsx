import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type MomentHeaderProps = {
  title: string;
  endsAt: string | Date;
  onBack?: () => void;
  onMore?: () => void;
  className?: string;
};

function formatRemaining(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function MomentHeader({ title, endsAt, onBack, onMore, className }: MomentHeaderProps) {
  const target = React.useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, target - now);
  const dissolved = remaining <= 0;

  return (
    <div className={cn('flex flex-col gap-2 p-3', className)}>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back">←</Button>
        <div className="text-lg font-semibold">{title}</div>
        <Button variant="ghost" size="sm" onClick={onMore} aria-label="More">•••</Button>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-base tabular-nums">{dissolved ? 'Ended' : formatRemaining(remaining)}</div>
        <div className="text-muted-foreground">Floq dissolves when timer ends</div>
      </div>
      <Separator />
    </div>
  );
}