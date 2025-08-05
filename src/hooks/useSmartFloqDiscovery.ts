import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';
import { useNearbyFloqs } from '@/hooks/useNearbyFloqs';
import { VibeAnalysisEngine, type VibeAnalysisResult, type SensorData } from '@/lib/vibeAnalysis/VibeAnalysisEngine';
import type { WalkableFloq } from '@/types/schemas/WalkableFloqSchema';
import type { Vibe } from '@/lib/vibes';

export interface SmartFloqMatch {
  floq: WalkableFloq;
  vibeMatchScore: number;
  confidenceScore: number;
  matchReasons: string[];
  contextFactors: {
    temporal: number;
    proximity: number;
    social: number;
    vibe: number;
  };
}

export interface SmartFloqDiscoveryOptions {
  maxDistance?: number; // km
  minVibeMatch?: number; // 0-1
  includeSocialSignals?: boolean;
  currentVibe?: Vibe;
  sensorData?: SensorData;
}

export function useSmartFloqDiscovery(options: SmartFloqDiscoveryOptions = {}) {
  const { user } = useAuth();
  const { coords } = useUnifiedLocation({
    enableTracking: false,
    enablePresence: false,
    hookId: 'smart-floq-discovery'
  });
  const position = coords; // Compatibility alias
  const {
    maxDistance = 2,
    minVibeMatch = 0.3,
    includeSocialSignals = true,
    currentVibe,
    sensorData
  } = options;

  // Get nearby floqs
  const { 
    nearby: nearbyFloqs, 
    loading: floqsLoading, 
    error: floqsError 
  } = useNearbyFloqs(
    position?.coords.latitude,
    position?.coords.longitude,
    { km: maxDistance }
  );

  // Smart analysis and matching
  const { data: smartMatches = [], isLoading: analysisLoading, error: analysisError } = useQuery({
    queryKey: ['smart-floq-discovery', user?.id, position?.coords, nearbyFloqs.length, currentVibe, sensorData],
    queryFn: async (): Promise<SmartFloqMatch[]> => {
      if (!nearbyFloqs.length || !user) return [];

      const vibeEngine = new VibeAnalysisEngine();
      const now = new Date();
      const analysisContext = {
        timestamp: now,
        dayOfWeek: now.getDay(),
        hourOfDay: now.getHours(),
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
        timeOfDay: getTimeOfDay(now.getHours()),
        weather: 'clear', // TODO: Integrate weather API
        location: position ? {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        } : undefined
      };

      const smartMatches: SmartFloqMatch[] = [];

      for (const floq of nearbyFloqs) {
        try {
          // Calculate vibe compatibility
          const vibeCompatibility = calculateVibeCompatibility(
            currentVibe || 'social',
            floq.primary_vibe,
            floq.vibe_tag
          );

          // If vibe match is too low, skip
          if (vibeCompatibility < minVibeMatch) continue;

          // Analyze with vibe engine if sensor data available
          let vibeAnalysis: VibeAnalysisResult | null = null;
          if (sensorData) {
            vibeAnalysis = await vibeEngine.analyzeVibe(sensorData, analysisContext);
          }

          // Calculate context factors
          const contextFactors = {
            temporal: calculateTemporalFactor(floq, now),
            proximity: calculateProximityFactor(floq, position),
            social: includeSocialSignals ? calculateSocialFactor(floq, user.id) : 0.5,
            vibe: vibeCompatibility
          };

          // Calculate overall confidence score
          const confidenceScore = calculateOverallConfidence(
            contextFactors,
            vibeAnalysis,
            floq
          );

          // Generate match reasons
          const matchReasons = generateMatchReasons(
            floq,
            contextFactors,
            vibeAnalysis,
            currentVibe
          );

          smartMatches.push({
            floq,
            vibeMatchScore: vibeCompatibility,
            confidenceScore,
            matchReasons,
            contextFactors
          });
        } catch (error) {
          console.error('Error analyzing floq:', floq.id, error);
        }
      }

      // Sort by confidence score
      return smartMatches.sort((a, b) => b.confidenceScore - a.confidenceScore);
    },
    enabled: !floqsLoading && nearbyFloqs.length > 0 && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  return {
    smartMatches,
    loading: floqsLoading || analysisLoading,
    error: floqsError || analysisError?.message || null,
    rawFloqs: nearbyFloqs,
    hasLocation: !!position,
    analysisEnabled: !!sensorData || !!currentVibe
  };
}

// Helper functions
function getTimeOfDay(hour: number): 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late-night' {
  if (hour < 6) return 'late-night';
  if (hour < 9) return 'early-morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function calculateVibeCompatibility(userVibe: Vibe, floqVibe: Vibe, floqVibeTag?: Vibe): number {
  // Base compatibility matrix
  const vibeCompatibility: Record<Vibe, Record<Vibe, number>> = {
    social: { social: 1.0, energetic: 0.8, chill: 0.6, creative: 0.7, adventurous: 0.8, focused: 0.3, romantic: 0.6, mysterious: 0.4 },
    energetic: { energetic: 1.0, social: 0.8, adventurous: 0.9, creative: 0.7, chill: 0.2, focused: 0.4, romantic: 0.5, mysterious: 0.6 },
    chill: { chill: 1.0, social: 0.6, creative: 0.8, romantic: 0.7, focused: 0.6, energetic: 0.2, adventurous: 0.3, mysterious: 0.5 },
    creative: { creative: 1.0, chill: 0.8, social: 0.7, mysterious: 0.8, focused: 0.7, energetic: 0.7, adventurous: 0.6, romantic: 0.6 },
    adventurous: { adventurous: 1.0, energetic: 0.9, social: 0.8, mysterious: 0.7, creative: 0.6, romantic: 0.4, chill: 0.3, focused: 0.2 },
    focused: { focused: 1.0, creative: 0.7, chill: 0.6, mysterious: 0.5, social: 0.3, romantic: 0.4, energetic: 0.4, adventurous: 0.2 },
    romantic: { romantic: 1.0, chill: 0.7, mysterious: 0.8, creative: 0.6, social: 0.6, focused: 0.4, energetic: 0.5, adventurous: 0.4 },
    mysterious: { mysterious: 1.0, romantic: 0.8, creative: 0.8, focused: 0.5, adventurous: 0.7, chill: 0.5, social: 0.4, energetic: 0.6 }
  };

  const primaryMatch = vibeCompatibility[userVibe]?.[floqVibe] || 0.5;
  const tagMatch = floqVibeTag ? vibeCompatibility[userVibe]?.[floqVibeTag] || 0.5 : 0;
  
  // Weight primary vibe more heavily
  return primaryMatch * 0.7 + tagMatch * 0.3;
}

function calculateTemporalFactor(floq: WalkableFloq, now: Date): number {
  const hour = now.getHours();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  
  // Check if floq is currently active
  if (floq.starts_at && floq.ends_at) {
    const startTime = new Date(floq.starts_at);
    const endTime = new Date(floq.ends_at);
    
    if (now >= startTime && now <= endTime) {
      return 1.0; // Perfect timing
    } else if (now < startTime) {
      const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return Math.max(0, 1 - hoursUntilStart / 24); // Decay over 24 hours
    }
  }
  
  // Default temporal scoring based on time of day and floq vibe
  if (floq.primary_vibe === 'energetic' && (hour >= 20 || hour <= 2)) return 0.9;
  if (floq.primary_vibe === 'chill' && hour >= 14 && hour <= 18) return 0.8;
  if (floq.primary_vibe === 'social' && hour >= 17 && hour <= 23) return 0.9;
  
  return 0.6; // Neutral score
}

function calculateProximityFactor(floq: WalkableFloq, position: GeolocationPosition | null): number {
  if (!position || !floq.distance_m) return 0.5;
  
  const distanceKm = floq.distance_m / 1000;
  
  // Closer is better, with diminishing returns
  if (distanceKm <= 0.2) return 1.0;
  if (distanceKm <= 0.5) return 0.9;
  if (distanceKm <= 1.0) return 0.7;
  if (distanceKm <= 2.0) return 0.5;
  return 0.3;
}

function calculateSocialFactor(floq: WalkableFloq, userId: string): number {
  // Check for friends in floq
  const friendsGoing = floq.friends_going_count || 0;
  if (friendsGoing > 0) return Math.min(1.0, 0.5 + friendsGoing * 0.2);
  
  // Check participant count for social proof
  const participants = floq.participant_count || 0;
  if (participants === 0) return 0.2; // Empty floqs are less appealing
  if (participants <= 3) return 0.6;
  if (participants <= 8) return 0.8;
  return 1.0; // Popular floqs
}

function calculateOverallConfidence(
  contextFactors: SmartFloqMatch['contextFactors'],
  vibeAnalysis: VibeAnalysisResult | null,
  floq: WalkableFloq
): number {
  const weights = {
    vibe: 0.3,
    temporal: 0.25,
    proximity: 0.2,
    social: 0.15,
    analysis: 0.1
  };
  
  let score = 
    contextFactors.vibe * weights.vibe +
    contextFactors.temporal * weights.temporal +
    contextFactors.proximity * weights.proximity +
    contextFactors.social * weights.social;
  
  // Add vibe analysis boost if available
  if (vibeAnalysis) {
    score += vibeAnalysis.confidence * weights.analysis;
  } else {
    score += 0.5 * weights.analysis; // Neutral when no analysis
  }
  
  return Math.min(1.0, score);
}

function generateMatchReasons(
  floq: WalkableFloq,
  contextFactors: SmartFloqMatch['contextFactors'],
  vibeAnalysis: VibeAnalysisResult | null,
  currentVibe?: Vibe
): string[] {
  const reasons: string[] = [];
  
  if (contextFactors.vibe > 0.7) {
    reasons.push(`Perfect vibe match for ${currentVibe || 'your mood'}`);
  } else if (contextFactors.vibe > 0.5) {
    reasons.push(`Good vibe compatibility`);
  }
  
  if (contextFactors.proximity > 0.8) {
    reasons.push('Very close to you');
  } else if (contextFactors.proximity > 0.6) {
    reasons.push('Walking distance');
  }
  
  if (contextFactors.social > 0.7) {
    if (floq.friends_going_count > 0) {
      reasons.push(`${floq.friends_going_count} friend${floq.friends_going_count > 1 ? 's' : ''} going`);
    } else {
      reasons.push('Popular with others');
    }
  }
  
  if (contextFactors.temporal > 0.8) {
    reasons.push('Perfect timing');
  }
  
  if (vibeAnalysis && vibeAnalysis.confidence > 0.7) {
    reasons.push('AI recommends based on your current state');
  }
  
  return reasons;
}