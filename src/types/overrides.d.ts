// Type overrides for generated Supabase types
import type { Json } from '@/integrations/supabase/types';

declare module '@/integrations/supabase/types' {
  interface ProximityEventRecord {
    ml_features?: Json;
    profile_id_a?: string;
    profile_id_b?: string;
    distance_meters?: number;
    confidence?: number;
  }
  
  interface LocationPoint {
    accuracy?: number;
  }

  interface MLFeatureVector {
    anomaly?: number;
    intensity?: number;
    social?: number;
    temporal?: number;
    location?: number;
    personal?: number;
  }

  interface EnvFactors {
    locationStability?: number;
    socialContext?: number;
    venueInfluence?: number;
    privacyComfort?: number;
    weather?: number;
    timeOfDay?: number;
    dayOfWeek?: number;
    crowd?: number;
    noise?: number;
    lighting?: number;
  }

  interface RecapData {
    day: string;
    totalMins: number;
    venues: number;
    encounters: number;
    vibeShifts: number;
    topVibe: string;
    highlights: string[];
  }
}