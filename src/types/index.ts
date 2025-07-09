// Core type definitions for floq app
export type Vibe = 
  | 'chill' | 'hype' | 'curious' | 'social' | 'solo' 
  | 'romantic' | 'weird' | 'down' | 'flowing' | 'open';

export type ClusterType = 
  | 'nightlife' | 'cafe' | 'park' | 'transit' | 'creative' | 'wellness';

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