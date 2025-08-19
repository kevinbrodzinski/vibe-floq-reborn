import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export type MomentHeaderProps = {
  title: string;
  endsAt: string | Date; // ISO ok
  onBack?: () => void;
  onMore?: () => void;
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

export default function MomentHeader({ title, endsAt, onBack, onMore }: MomentHeaderProps) {
  const target = useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, target - now);
  const dissolved = remaining <= 0;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back">
          ←
        </Button>
        <h1 className="text-xl font-bold">{title}</h1>
        <Button variant="ghost" size="sm" onClick={onMore} aria-label="More options">•••</Button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">{dissolved ? 'Ended' : formatRemaining(remaining)}</span>
        <span className="text-sm text-muted-foreground">Floq dissolves when timer ends</span>
      </div>
      <Separator />
    </div>
  );
}