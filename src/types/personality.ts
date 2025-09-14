import type { Vibe } from '@/lib/vibes';

export type PersonalityInsights = {
  hasEnoughData: boolean;
  chronotype: 'lark' | 'owl' | 'balanced';
  energyType: 'high-energy' | 'low-energy' | 'balanced';
  socialType: 'social' | 'solo' | 'balanced';
  consistency: 'very-consistent' | 'consistent' | 'adaptive' | 'highly-adaptive';
  temporalPrefs?: Record<number, Partial<Record<Vibe, number>>>;
  confidence: number; // 0-1
  lastUpdated: number;
  dataQuality: 'low' | 'medium' | 'high';
  
  // Enhanced pattern analysis
  venueImpacts?: import('@/core/vibe/analysis/VenuePatternAnalyzer').VenueImpact[];
  behaviorSequences?: import('@/core/vibe/analysis/SequenceDetector').BehaviorSequence[];
  triggerPatterns?: import('@/core/vibe/analysis/SequenceDetector').TriggerPattern[];
  temporalInsights?: import('@/core/vibe/analysis/AdvancedTemporalAnalyzer').TemporalInsight;
  microTemporalPatterns?: import('@/core/vibe/analysis/AdvancedTemporalAnalyzer').MicroTemporalPattern[];
};