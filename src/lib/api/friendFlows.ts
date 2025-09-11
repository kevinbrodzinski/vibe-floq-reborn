import { supabase } from '@/integrations/supabase/client';

export type FriendFlowLine = {
  friend_id: string;
  friend_name: string | null;
  avatar_url: string | null;
  flow_id: string;
  t_head: string;
  line_geojson: any;
  head_lng: number;
  head_lat: number;
};

export async function fetchFriendFlows(params: {
  bbox: [number, number, number, number]; // [W,S,E,N]
  sinceMinutes?: number;
}): Promise<FriendFlowLine[]> {
  const { bbox, sinceMinutes = 90 } = params;
  const [w, s, e, n] = bbox;
  
  const { data, error } = await supabase.rpc('recent_friend_flows_secure', {
    west: w, 
    south: s, 
    east: e, 
    north: n, 
    since_minutes: sinceMinutes
  });
  
  if (error) {
    console.warn('[friend-flows] rpc error', error);
    return [];
  }
  
  return (data ?? []) as FriendFlowLine[];
}