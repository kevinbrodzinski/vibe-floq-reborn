
// Core type definitions for floq app (aligned with Supabase types)
import { Database } from '@/integrations/supabase/types';

export type Vibe = Database['public']['Enums']['vibe_enum'];
export type ClusterType = Database['public']['Enums']['cluster_type_enum'];

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

export interface UserProfile {
  id: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  created_at: string;
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
}
