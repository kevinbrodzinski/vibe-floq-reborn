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

  // Vibe system types
  interface VibePrediction {
    vibe: string;
    probability: number;
    timeframe: string;
    reason: string;
    confidence: number;
  }

  interface PredictionsData {
    nextVibeTransition: VibePrediction;
    contextualSuggestions: VibePrediction[];
    locationBasedTransitions?: VibePrediction[];
  }

  interface AlignmentData {
    friendMatches?: any;
    [key: string]: any;
  }
}

/* Location system type extensions */
export type LocationError = 'denied' | 'unavailable' | 'timeout' | 'permission_denied' | 'position_unavailable';

/* Enhanced geolocation status union */
export type LocationStatus = 'idle' | 'fetching' | 'success' | 'error' | 'debug' | 'loading' | 'ready';

/* Enhanced ML types for vibe prediction */
export interface MLFeatureVector {
  accelMean: number;
  accelStd: number;
  micDb: number;
  stepRate: number;
  anomaly?: number;
}

export interface RawMLPrediction {
  featureVector: MLFeatureVector;
  ensembleScores: Record<string, number>;
  uncertainty: number;
  predictionInterval: [number, number];
}

export interface VibePredictionEnhanced {
  vibe: string;
  score: number;
  probability: number;
  timeframe: string;
  reason: string;
}

export function toVibePredictions(model: RawMLPrediction): VibePredictionEnhanced[];