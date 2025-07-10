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

  // EMERGENCY STABILIZATION: Disabled presence queries
  const people: LivePresence[] = [];

  // EMERGENCY STABILIZATION: Disabled all bucket computation and subscription logic

  // EMERGENCY STABILIZATION: Disabled all WebSocket subscriptions
  // useEffect(() => { ... maybeResubscribe(); }, [lat, lng]);
  // useEffect(() => { ... cleanup channels; }, []);

  // Return empty array for now
  return { people };
};