import * as React from 'react';
import { MomentHeader } from '@/components/momentary/MomentHeader';
import { MomentumIndicator, type MomentumState } from '@/components/momentary/MomentumIndicator';
import { CurrentStopCard } from '@/components/momentary/CurrentStopCard';
import { UpcomingStopsCarousel } from '@/components/momentary/UpcomingStopsCarousel';
import { EphemeralFeed } from '@/components/momentary/EphemeralFeed';
import { ActionBar } from '@/components/momentary/ActionBar';
import { postMomentFeed } from '@/hooks/useMomentFeed';
import { supabase } from '@/integrations/supabase/client';

export type MomentaryFloqDetailProps = {
  floqId: string;
  title: string;
  endsAt: string | Date;
  momentum?: MomentumState;
};

export default function MomentaryFloqDetail({ floqId, title, endsAt, momentum = 'gaining' }: MomentaryFloqDetailProps) {
  const onJoin = React.useCallback(async () => {
    await supabase.rpc('rpc_session_join', { in_floq_id: floqId, in_status: 'here' });
  }, [floqId]);

  const onSaveRipple = React.useCallback(async () => {
    await postMomentFeed(floqId, { kind: 'vibe', text: 'Saved as Ripple' });
  }, [floqId]);

  return (
    <div className="flex flex-col min-h-dvh">
      <MomentHeader title={title} endsAt={endsAt} />
      <div className="space-y-4 p-3">
        <MomentumIndicator state={momentum} />
        <CurrentStopCard venueName="Current Venue" friendsHere={9} vibePulse0to1={0.7} />
        <UpcomingStopsCarousel stops={[{ id: '1', name: 'Next Bar', eta: '10m' }, { id: '2', name: 'Late Night Taco' }]} />
        <EphemeralFeed floqId={floqId} />
      </div>
      <ActionBar onJoin={onJoin} onSaveRipple={onSaveRipple} />
    </div>
  );
}