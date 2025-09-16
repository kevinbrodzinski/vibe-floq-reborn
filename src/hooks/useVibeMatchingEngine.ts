import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Vibe vector definitions for similarity calculations
const VIBE_VECTORS = {
  social: [0.8, 0.6, 0.4, 0.7, 0.9], // high social, medium energy
  chill: [0.3, 0.9, 0.8, 0.5, 0.4],  // low energy, high calm
  adventure: [0.7, 0.3, 0.2, 0.9, 0.8], // high thrill, low calm  
  creative: [0.6, 0.5, 0.7, 0.6, 0.8], // balanced with creativity boost
  focus: [0.2, 0.7, 0.9, 0.3, 0.5],    // high focus, low social
  party: [0.9, 0.2, 0.1, 0.8, 0.9],    // maximum social and energy
  intimate: [0.4, 0.8, 0.9, 0.4, 0.6], // small group, high trust
  spontaneous: [0.6, 0.4, 0.3, 0.8, 0.7] // medium social, high spontaneity
} as const;

export interface VibeProfile {
  dominant_vibe: keyof typeof VIBE_VECTORS;
  energy_level: number; // 0-1
  social_preference: number; // 0-1 (low = intimate, high = large groups)
  adventure_seeking: number; // 0-1
  recent_activities: string[]; // recent vibe states
  compatibility_preferences?: {
    avoid_vibes?: string[];
    prefer_vibes?: string[];
    energy_tolerance?: number; // how much energy difference is acceptable
  };
}

interface FloqVibeData {
  id: string;
  primary_vibe: string;
  current_energy: number;
  member_vibes: string[];
  dominant_member_vibe?: string;
  vibe_diversity_score: number; // 0-1, higher = more diverse vibes
  energy_consistency: number; // 0-1, higher = more consistent energy levels
}

export function useVibeMatchingEngine() {
  const { user } = useAuth();

  // Calculate vibe vector similarity using cosine similarity
  const calculateVibeSimilarity = useMemo(() => {
    return (vibe1: keyof typeof VIBE_VECTORS, vibe2: keyof typeof VIBE_VECTORS): number => {
      const v1 = VIBE_VECTORS[vibe1];
      const v2 = VIBE_VECTORS[vibe2];
      
      if (!v1 || !v2) return 0;

      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < v1.length; i++) {
        dotProduct += v1[i] * v2[i];
        norm1 += v1[i] * v1[i];
        norm2 += v2[i] * v2[i];
      }

      const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
      return Math.max(0, Math.min(1, (similarity + 1) / 2)); // Normalize to 0-1
    };
  }, []);

  // Calculate comprehensive compatibility score
  const calculateCompatibilityScore = useMemo(() => {
    return (userProfile: VibeProfile, floqData: FloqVibeData): number => {
      let score = 0;
      let weightSum = 0;

      // 1. Primary vibe compatibility (30% weight)
      const primaryVibeMatch = calculateVibeSimilarity(
        userProfile.dominant_vibe,
        floqData.primary_vibe as keyof typeof VIBE_VECTORS
      );
      score += primaryVibeMatch * 0.3;
      weightSum += 0.3;

      // 2. Energy level compatibility (25% weight)
      const energyDiff = Math.abs(userProfile.energy_level - floqData.current_energy);
      const energyTolerance = userProfile.compatibility_preferences?.energy_tolerance || 0.3;
      const energyMatch = Math.max(0, 1 - (energyDiff / energyTolerance));
      score += energyMatch * 0.25;
      weightSum += 0.25;

      // 3. Member vibe diversity bonus/penalty (20% weight)
      const diversityPreference = userProfile.social_preference > 0.7 ? 
        floqData.vibe_diversity_score : // high social = like diversity
        (1 - floqData.vibe_diversity_score); // low social = prefer consistency
      score += diversityPreference * 0.2;
      weightSum += 0.2;

      // 4. Avoid/prefer vibe modifiers (15% weight)
      const prefs = userProfile.compatibility_preferences;
      if (prefs?.avoid_vibes?.includes(floqData.primary_vibe)) {
        score -= 0.15; // Penalty for avoided vibes
      }
      if (prefs?.prefer_vibes?.includes(floqData.primary_vibe)) {
        score += 0.15; // Bonus for preferred vibes
      }
      weightSum += 0.15;

      // 5. Recent activity pattern matching (10% weight)
      const recentVibeMatch = userProfile.recent_activities.some(activity =>
        floqData.member_vibes.includes(activity)
      ) ? 0.1 : 0;
      score += recentVibeMatch;
      weightSum += 0.1;

      return Math.max(0, Math.min(1, score / Math.max(weightSum, 1)));
    };
  }, [calculateVibeSimilarity]);

  // Generate vibe-based recommendations
  const generateVibeRecommendations = useMemo(() => {
    return (userProfile: VibeProfile, availableFloqs: FloqVibeData[]): FloqVibeData[] => {
      const scoredFloqs = availableFloqs.map(floq => ({
        ...floq,
        compatibility_score: calculateCompatibilityScore(userProfile, floq)
      }));

      // Sort by compatibility score with some randomness for serendipity
      return scoredFloqs
        .sort((a, b) => {
          const scoreA = a.compatibility_score + (Math.random() - 0.5) * 0.1; // 10% randomness
          const scoreB = b.compatibility_score + (Math.random() - 0.5) * 0.1;
          return scoreB - scoreA;
        })
        .filter(floq => floq.compatibility_score > 0.3); // Only return decent matches
    };
  }, [calculateCompatibilityScore]);

  // Analyze group vibe dynamics
  const analyzeGroupVibes = useMemo(() => {
    return (memberVibes: string[]) => {
      if (memberVibes.length === 0) return null;

      const vibeCount = memberVibes.reduce((acc, vibe) => {
        acc[vibe] = (acc[vibe] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalMembers = memberVibes.length;
      const uniqueVibes = Object.keys(vibeCount).length;
      const diversityScore = uniqueVibes / Math.min(totalMembers, 8); // Normalize by max expected diversity

      // Find dominant vibe
      const dominantVibe = Object.entries(vibeCount)
        .sort(([,a], [,b]) => b - a)[0];

      // Calculate energy consistency
      const vibeEnergies = memberVibes.map(vibe => {
        const vector = VIBE_VECTORS[vibe as keyof typeof VIBE_VECTORS];
        return vector ? vector[1] : 0.5; // Use energy dimension from vector
      });
      
      const avgEnergy = vibeEnergies.reduce((a, b) => a + b, 0) / vibeEnergies.length;
      const energyVariance = vibeEnergies.reduce((acc, energy) => 
        acc + Math.pow(energy - avgEnergy, 2), 0) / vibeEnergies.length;
      const energyConsistency = Math.max(0, 1 - Math.sqrt(energyVariance));

      return {
        dominant_vibe: dominantVibe[0],
        dominant_percentage: dominantVibe[1] / totalMembers,
        diversity_score: Math.min(1, diversityScore),
        energy_consistency: energyConsistency,
        average_energy: avgEnergy,
        vibe_distribution: vibeCount,
        harmony_score: energyConsistency * 0.6 + (1 - diversityScore) * 0.4, // Preference for consistent, cohesive groups
        recommended_vibes: this.getComplementaryVibes(dominantVibe[0])
      };
    };
  }, []);

  // Get complementary vibes for group suggestions
  const getComplementaryVibes = (dominantVibe: string) => {
    const complementaryMap: Record<string, string[]> = {
      social: ['creative', 'adventure'],
      chill: ['intimate', 'creative'],
      adventure: ['social', 'spontaneous'],
      creative: ['chill', 'focus'],
      focus: ['creative', 'intimate'],
      party: ['social', 'spontaneous'],
      intimate: ['chill', 'focus'],
      spontaneous: ['adventure', 'party']
    };

    return complementaryMap[dominantVibe] || [];
  };

  // Predict optimal vibe transitions
  const predictVibeTransition = (currentVibe: string, timeOfDay: number, groupSize: number) => {
    const hour = timeOfDay;
    
    // Time-based vibe preferences
    const timeVibeMap = {
      morning: ['focus', 'creative', 'chill'], // 6-12
      afternoon: ['social', 'adventure', 'creative'], // 12-18
      evening: ['social', 'party', 'spontaneous'], // 18-22
      night: ['intimate', 'chill', 'party'] // 22-6
    };

    let timeSlot: keyof typeof timeVibeMap;
    if (hour >= 6 && hour < 12) timeSlot = 'morning';
    else if (hour >= 12 && hour < 18) timeSlot = 'afternoon';
    else if (hour >= 18 && hour < 22) timeSlot = 'evening';
    else timeSlot = 'night';

    // Group size influence
    const groupVibeMap = {
      small: ['intimate', 'focus', 'chill'], // 1-3 people
      medium: ['creative', 'adventure', 'social'], // 4-8 people
      large: ['party', 'social', 'spontaneous'] // 9+ people
    };

    let groupSlot: keyof typeof groupVibeMap;
    if (groupSize <= 3) groupSlot = 'small';
    else if (groupSize <= 8) groupSlot = 'medium';
    else groupSlot = 'large';

    const timeVibes = timeVibeMap[timeSlot];
    const groupVibes = groupVibeMap[groupSlot];
    
    // Find intersection or fallback to time-based
    const recommendedVibes = timeVibes.filter(vibe => groupVibes.includes(vibe));
    return recommendedVibes.length > 0 ? recommendedVibes : timeVibes;
  };

  return {
    calculateVibeSimilarity,
    calculateCompatibilityScore,  
    generateVibeRecommendations,
    analyzeGroupVibes,
    getComplementaryVibes,
    predictVibeTransition,
    
    // Utility functions
    getVibeVector: (vibe: string) => VIBE_VECTORS[vibe as keyof typeof VIBE_VECTORS],
    getAllVibes: () => Object.keys(VIBE_VECTORS),
    
    // Quick compatibility check
    isVibeCompatible: (vibe1: string, vibe2: string, threshold = 0.6) => 
      calculateVibeSimilarity(
        vibe1 as keyof typeof VIBE_VECTORS, 
        vibe2 as keyof typeof VIBE_VECTORS
      ) >= threshold
  };
}