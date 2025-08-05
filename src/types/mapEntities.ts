import type { Database } from '@/integrations/supabase/Database';

// Base types from database
export type DatabaseFloq = Database['public']['Tables']['floqs']['Row'];
export type DatabasePlan = Database['public']['Tables']['floq_plans']['Row'];
export type DatabasePlanStop = Database['public']['Tables']['plan_stops']['Row'];
export type VibeEnum = Database['public']['Enums']['vibe_enum'];

// Map-specific floq interface (what gets rendered on map)
export interface MapFloq {
  id: string;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  primary_vibe: VibeEnum;
  vibe_tag?: VibeEnum;
  participant_count?: number;
  creator_id?: string;
  starts_at?: string;
  ends_at?: string;
  max_participants?: number;
  radius_m?: number;
  distance_meters?: number;
  friend_name?: string;
  address?: string;
  type: 'floq'; // Discriminator for rendering
}

// Map-specific plan interface (what gets rendered on map)
export interface MapPlan {
  id: string;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  vibe_tag?: string;
  vibe_tags?: string[];
  creator_id: string;
  planned_at: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  max_participants?: number;
  participant_count?: number;
  stop_count?: number; // Number of stops in the plan
  distance_meters?: number;
  friend_name?: string;
  address?: string;
  type: 'plan'; // Discriminator for rendering
}

// Union type for map entities
export type MapEntity = MapFloq | MapPlan;

// Props for map components
export interface MapEntityProps {
  floqs?: MapFloq[];
  plans?: MapPlan[];
}

// Utility functions to convert database types to map types
export function databaseFloqToMapFloq(dbFloq: any): MapFloq {
  // Extract coordinates from PostGIS location
  const coords = extractCoordinates(dbFloq.location || dbFloq.geo);
  
  return {
    id: dbFloq.id,
    title: dbFloq.title || dbFloq.name || 'Untitled Floq',
    description: dbFloq.description,
    lat: coords.lat,
    lng: coords.lng,
    primary_vibe: dbFloq.primary_vibe || dbFloq.vibe_tag,
    vibe_tag: dbFloq.vibe_tag,
    participant_count: dbFloq.participant_count || 0,
    creator_id: dbFloq.creator_id,
    starts_at: dbFloq.starts_at,
    ends_at: dbFloq.ends_at,
    max_participants: dbFloq.max_participants,
    radius_m: dbFloq.radius_m,
    distance_meters: dbFloq.distance_meters,
    friend_name: dbFloq.friend_name,
    address: dbFloq.address,
    type: 'floq'
  };
}

export function databasePlanToMapPlan(dbPlan: any): MapPlan {
  // Extract coordinates from PostGIS location
  const coords = extractCoordinates(dbPlan.location);
  
  return {
    id: dbPlan.id,
    title: dbPlan.title,
    description: dbPlan.description || dbPlan.plan_summary,
    lat: coords.lat,
    lng: coords.lng,
    vibe_tag: dbPlan.vibe_tag,
    vibe_tags: dbPlan.vibe_tags,
    creator_id: dbPlan.creator_id,
    planned_at: dbPlan.planned_at,
    start_time: dbPlan.start_time,
    end_time: dbPlan.end_time,
    status: dbPlan.status,
    max_participants: dbPlan.max_participants,
    participant_count: dbPlan.participant_count || 0,
    stop_count: dbPlan.stop_count || 1,
    distance_meters: dbPlan.distance_meters,
    friend_name: dbPlan.friend_name,
    address: dbPlan.address,
    type: 'plan'
  };
}

// Helper to extract coordinates from PostGIS geometry
function extractCoordinates(location: any): { lat: number; lng: number } {
  if (!location) return { lat: 0, lng: 0 };
  
  try {
    // Handle different PostGIS formats
    if (typeof location === 'string') {
      // Parse WKT format like "POINT(-122.4194 37.7749)"
      const match = location.match(/POINT\(([^)]+)\)/);
      if (match) {
        const [lng, lat] = match[1].split(' ').map(Number);
        return { lat, lng };
      }
    } else if (location.coordinates) {
      // GeoJSON format
      const [lng, lat] = location.coordinates;
      return { lat, lng };
    } else if (location.x !== undefined && location.y !== undefined) {
      // PostGIS point format
      return { lat: location.y, lng: location.x };
    }
  } catch (error) {
    console.warn('Failed to extract coordinates from location:', location, error);
  }
  
  return { lat: 0, lng: 0 };
}