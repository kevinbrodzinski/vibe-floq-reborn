import type { Vibe } from '@/lib/vibes';
import type { ComponentScores } from '@/core/vibe/types';
import type { VenueIntelligence } from '@/types/venues';
import type { PersonalityInsights } from '@/types/personality';

// Core context fact types
export type ContextFact = 
  | { type: 'vibe_correction'; data: { from: Vibe; to: Vibe; components: ComponentScores; confidence: number } }
  | { type: 'venue_transition'; data: { from: string | null; to: string | null; dwellTime: number; energyImpact: number } }
  | { type: 'pattern_detected'; data: { pattern: string; confidence: number; category: 'temporal' | 'venue' | 'energy' } }
  | { type: 'recommendation_acted'; data: { action: string; outcome: 'positive' | 'negative' | 'neutral'; context: string } }
  | { type: 'session_context'; data: { entry: 'cold_start' | 'resume'; lastVibe: Vibe; timeGap: number } }
  | { type: 'energy_transition'; data: { from: number; to: number; trigger: string; magnitude: number } };

export interface ContextFactWithId {
  id: string;
  timestamp: number;
  hash?: string;
  type: ContextFact['type'];
  data: ContextFact['data'];
}

// Working set for current session context
export interface WorkingSet {
  currentVibe: Vibe;
  confidence: number;
  components: ComponentScores;
  patterns: PersonalityInsights | null;
  venueContext: VenueIntelligence | null;
  timestamp: number;
  sessionDuration: number;
}

// Context synthesis results
export interface VibeTransition {
  from: Vibe;
  to: Vibe;
  duration: number;
  confidence: number;
  trigger?: string;
}

export interface VenuePattern {
  venueType: string;
  visitCount: number;
  averageEnergy: number;
  energyImpact: number;
  optimalDuration: number;
}

export interface CorrectionTrend {
  pattern: string;
  frequency: number;
  accuracy: number;
  improvement: number;
}

export interface ContextualInsight {
  id: string;
  text: string;
  confidence: number;
  category: 'temporal' | 'venue' | 'energy' | 'behavioral';
  contextual: boolean;
}

export interface ContextSummary {
  vibeTransitions: VibeTransition[];
  venueSequence: VenuePattern[];
  correctionTrends: CorrectionTrend[];
  contextualInsights: ContextualInsight[];
  factCount: number;
  confidence: number;
  summary: string;
}