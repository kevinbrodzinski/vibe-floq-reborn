// Core type definitions for floq app (aligned with Supabase types)
import { Database } from '@/integrations/supabase/Database';
import type { Vibe } from '@/types/vibes';

export type { Vibe } from '@/types/vibes';
export type ClusterType = Database['public']['Enums']['cluster_type_enum'];
export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface NearbyUser {
  user_id: string;
  vibe: Vibe;
  distance_meters: number;
  updated_at: string;
}

export interface WalkableFloq {
  id: string;
  title: string;
  primary_vibe: Vibe;
  participant_count: number;
  distance_meters: number;
  starts_at: string;
}

export interface PresenceData {
  user_id: string;
  vibe: Vibe;
  location: [number, number]; // [lng, lat]
  broadcast_radius: number;
  visibility: string;
  updated_at: string;
  expires_at: string;
}

export interface LivePresence {
  user_id: string;
  vibe: string | null;
  lat: number;
  lng: number;
  venue_id: string | null;
  expires_at: string;
  isFriend?: boolean; // 6.3 - Add friend detection flag
}

export interface CrossedPath {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_ts: string;
  overlap_sec: number;
  venue_id: string | null;
  distance_meters: number;
}
