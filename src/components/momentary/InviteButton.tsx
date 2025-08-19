import * as React from 'react';
import { Button } from '@/components/ui/button';
import { shareInvite } from '@/lib/invite';

export function InviteButton({ floqId, className }: { floqId: string; className?: string }) {
  const onInvite = React.useCallback(async () => {
    await shareInvite(floqId, { title: 'Join my Floq', text: "You and I are out — let's Floq." });
  }, [floqId]);
  return (
    <Button className={className} onClick={onInvite}>Invite Friend</Button>
  );
}