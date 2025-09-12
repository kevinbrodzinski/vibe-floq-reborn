import * as React from 'react';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/utils';

function fmtMMSS(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(s / 60).toString().padStart(1, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

type Props = {
  show?: boolean;
  nearbyCount: number;
  cohesion01: number;        // 0..1
  onInvite: () => void;

  // Cooldown behavior
  cooldownMs?: number;       // default 120_000
  lastInviteAt?: number | null;

  className?: string;
};

export function InviteNearbyChip({
  show,
  nearbyCount,
  cohesion01,
  onInvite,
  cooldownMs = 120_000,
  lastInviteAt,
  className
}: Props) {
  const [now, setNow] = React.useState<number>(() => Date.now());

  // Tick countdown when within cooldown
  const remaining = React.useMemo(() => {
    if (!lastInviteAt) return 0;
    const delta = cooldownMs - (now - lastInviteAt);
    return delta > 0 ? delta : 0;
  }, [now, lastInviteAt, cooldownMs]);

  React.useEffect(() => {
    if (!show) return;
    if (remaining <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [remaining, show]);

  if (!show) return null;

  // Auto-CTA text
  const cohHigh = cohesion01 >= 0.55;
  const base =
    cohHigh ? 'Form a Floq' :
    nearbyCount >= 3 ? `Ping ${nearbyCount} friends` :
    nearbyCount === 2 ? 'Ping 2 friends' :
    'Invite nearby';

  const disabled = remaining > 0;
  const labelText = disabled ? `Invited • ${fmtMMSS(remaining)}` : base;

  const aria = disabled
    ? `Invite on cooldown. Available again in ${fmtMMSS(remaining)}`
    : `Invite nearby friends — ${nearbyCount} around, ${Math.round(cohesion01 * 100)}% in sync`;

  return (
    <Chip
      color="indigo"
      onClick={disabled ? undefined : onInvite}
      pressed={false}
      className={cn(
        'h-8 px-3 text-xs font-medium shadow-sm border border-white/15',
        disabled
          ? 'opacity-60 cursor-not-allowed bg-indigo-500/15'
          : 'bg-indigo-500/20 hover:bg-indigo-500/30',
        'text-white',
        className
      )}
      aria-label={aria}
      title={aria}
    >
      👥 {labelText}
      {!disabled && (
        <span className="ml-2 opacity-80">· {nearbyCount} ({Math.round(cohesion01 * 100)}%)</span>
      )}
    </Chip>
  );
}