import React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import MomentHeader from '../components/FloqMoment/MomentHeader';
import MomentumIndicator, { MomentumState } from '../components/FloqMoment/MomentumIndicator';
import CurrentStopCard from '../components/FloqMoment/CurrentStopCard';
import UpcomingStopsCarousel from '../components/FloqMoment/UpcomingStopsCarousel';
import EphemeralFeed from '../components/FloqMoment/EphemeralFeed';
import ActionBar from '../components/FloqMoment/ActionBar';

export type MomentaryFloqDetailProps = {
  client: SupabaseClient;
  floqId: string;
  title: string;
  endsAt: string | Date;
  momentum?: MomentumState;
};

export default function MomentaryFloqDetail({ client, floqId, title, endsAt, momentum = 'gaining' }: MomentaryFloqDetailProps) {
  return (
    <div className="flex flex-col h-full">
      <MomentHeader title={title} endsAt={endsAt} />
      <ScrollArea className="flex-1">
        <MomentumIndicator state={momentum} />
        <div className="p-3 space-y-3">
          <CurrentStopCard venueName="Current Venue" friendsHere={9} vibePulse0to1={0.7} />
          <UpcomingStopsCarousel stops={[{ id: '1', name: 'Next Bar', eta: '10m' }, { id: '2', name: 'Late Night Taco' }]} />
          <Separator />
          <EphemeralFeed client={client} floqId={floqId} />
        </div>
      </ScrollArea>
      <ActionBar />
    </div>
  );
}