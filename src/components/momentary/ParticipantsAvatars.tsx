import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useParticipants } from '@/hooks/useParticipants';

export function ParticipantsAvatars({ floqId, max = 8, className }: { floqId: string; max?: number; className?: string }) {
  const rows = useParticipants(floqId);
  const shown = rows.slice(0, max);
  const extra = Math.max(0, rows.length - shown.length);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {shown.map((r) => (
        <Avatar key={r.profile_id} className="h-8 w-8 border">
          {r.avatar_url && <AvatarImage src={r.avatar_url} alt={r.display_name ?? ''} />}
          <AvatarFallback>{(r.display_name ?? '??').slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <div className="h-8 w-8 grid place-items-center rounded-full border text-xs">+{extra}</div>
      )}
    </div>
  );
}