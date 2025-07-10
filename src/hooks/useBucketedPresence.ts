import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ngeohash from 'ngeohash';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { differenceInMilliseconds } from 'date-fns';

/** precision-6 buckets → ~1.2 km edge */
const GH_PRECISION = 6;

export interface LivePresence {
  user_id: string;
  vibe: string | null;
  lat: number;
  lng: number;
  venue_id: string | null;
  expires_at: string; // ISO
}

export const useBucketedPresence = (lat?: number, lng?: number) => {
  const OFFLINE_MODE = import.meta.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
  
  if (OFFLINE_MODE) {
    const people: LivePresence[] = [];
    return { people };
  }

  // TODO: Re-enable presence subscriptions when network is stable
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const geosLastRef = useRef<string[]>([]);
  const lastLatRef = useRef<number>();
  const lastLngRef = useRef<number>();

  // Freeze coordinates once they become valid for stable cache keys
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    lastLatRef.current = lat;
    lastLngRef.current = lng;
  }

  const people: LivePresence[] = [];
  return { people };
};