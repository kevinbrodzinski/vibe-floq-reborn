import type { Vibe } from '@/lib/vibes';

export type VibeDist = Partial<Record<Vibe, number>>;

export type PersonalityInsights = {
  hasEnoughData: boolean;
  chronotype: 'lark' | 'owl' | 'balanced';
  energyType: 'high-energy' | 'low-energy' | 'balanced';
  socialType: 'social' | 'solo' | 'balanced';
  consistency: 'very-consistent' | 'consistent' | 'adaptive' | 'highly-adaptive';
  temporalPrefs?: Record<number, VibeDist>;
  confidence: number;            // 0..1
  lastUpdated: number;           // epoch ms
  dataQuality: 'low' | 'medium' | 'high';
  correctionCount: number;       // For backward compatibility
  
  // Enhanced pattern analysis
  venueImpacts?: import('@/core/vibe/analysis/VenuePatternAnalyzer').VenueImpact[];
  behaviorSequences?: import('@/core/vibe/analysis/SequenceDetector').BehaviorSequence[];
  triggerPatterns?: import('@/core/vibe/analysis/SequenceDetector').TriggerPattern[];
  temporalInsights?: import('@/core/vibe/analysis/AdvancedTemporalAnalyzer').TemporalInsight;
  microTemporalPatterns?: import('@/core/vibe/analysis/AdvancedTemporalAnalyzer').MicroTemporalPattern[];
};

// 🚨 Non-null, safe default used everywhere
export const EMPTY_INSIGHTS: PersonalityInsights = {
  hasEnoughData: false,
  chronotype: 'balanced',
  energyType: 'balanced',
  socialType: 'balanced',
  consistency: 'adaptive',
  temporalPrefs: {},
  confidence: 0,
  lastUpdated: 0,
  dataQuality: 'low',
  correctionCount: 0,
};