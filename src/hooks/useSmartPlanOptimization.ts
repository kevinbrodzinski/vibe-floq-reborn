import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { usePlanStops } from '@/hooks/usePlanStops';
import { usePlanParticipants } from '@/hooks/usePlanParticipants';
import { VibeAnalysisEngine, type VibeAnalysisResult, type SensorData } from '@/lib/vibeAnalysis/VibeAnalysisEngine';
import { useVenueRecommendations } from '@/hooks/useVenueRecommendations';
import type { PlanStop } from '@/types/planStop';
import type { Vibe } from '@/lib/vibes';

export interface OptimizedStop {
  originalStop?: PlanStop;
  suggestedVenue?: {
    id: string;
    name: string;
    category: string;
    vibeMatch: number;
    reasoning: string[];
  };
  suggestedTime?: {
    start: Date;
    end: Date;
    reasoning: string[];
  };
  vibeAlignment: number;
  energyLevel: number;
  crowdPrediction: {
    expectedBusyness: number;
    peakTime: string;
    compatibility: number;
  };
}

export interface PlanOptimizationSuggestion {
  type: 'timing' | 'venue' | 'order' | 'duration' | 'energy_flow';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  stopId?: string;
  suggestedChange?: any;
}

export interface SmartPlanOptimization {
  optimizedStops: OptimizedStop[];
  suggestions: PlanOptimizationSuggestion[];
  overallVibeFlow: {
    score: number;
    analysis: string;
    energyProgression: number[];
  };
  timeOptimization: {
    totalDuration: number;
    suggestedStartTime: Date;
    transitOptimized: boolean;
    bufferTime: number;
  };
  groupCompatibility: {
    score: number;
    conflicts: string[];
    harmonization: string[];
  };
}

export interface SmartPlanOptimizationOptions {
  groupVibes?: Vibe[];
  currentTime?: Date;
  sensorData?: SensorData;
  optimizeFor?: 'energy' | 'time' | 'cost' | 'experience';
  includeTransit?: boolean;
}

export function useSmartPlanOptimization(
  planId: string, 
  options: SmartPlanOptimizationOptions = {}
) {
  const { user } = useAuth();
  const { data: stops = [], isLoading: stopsLoading } = usePlanStops(planId);
  const { data: participants = [], isLoading: participantsLoading } = usePlanParticipants(planId);
  
  const {
    groupVibes = ['social'],
    currentTime = new Date(),
    sensorData,
    optimizeFor = 'experience',
    includeTransit = true
  } = options;

  const { data: optimization, isLoading: optimizationLoading, error } = useQuery({
    queryKey: ['smart-plan-optimization', planId, stops.length, participants.length, groupVibes, optimizeFor],
    queryFn: async (): Promise<SmartPlanOptimization> => {
      if (!stops.length || !user) {
        return {
          optimizedStops: [],
          suggestions: [],
          overallVibeFlow: { score: 0, analysis: '', energyProgression: [] },
          timeOptimization: { totalDuration: 0, suggestedStartTime: currentTime, transitOptimized: false, bufferTime: 0 },
          groupCompatibility: { score: 0, conflicts: [], harmonization: [] }
        };
      }

      const vibeEngine = new VibeAnalysisEngine();
      const analysisContext = {
        timestamp: currentTime,
        dayOfWeek: currentTime.getDay(),
        hourOfDay: currentTime.getHours(),
        isWeekend: currentTime.getDay() === 0 || currentTime.getDay() === 6,
        timeOfDay: getTimeOfDay(currentTime.getHours()),
        weather: 'clear', // TODO: Integrate weather API
      };

      // Analyze each stop
      const optimizedStops: OptimizedStop[] = [];
      const suggestions: PlanOptimizationSuggestion[] = [];
      const energyProgression: number[] = [];

      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const stopTime = stop.start_time ? new Date(stop.start_time) : new Date(currentTime.getTime() + i * 2 * 60 * 60 * 1000);
        
        // Analyze vibe compatibility
        const vibeAlignment = calculateStopVibeAlignment(stop, groupVibes);
        const energyLevel = calculateEnergyLevel(stop, stopTime, i, stops.length);
        
        // Crowd prediction
        const crowdPrediction = await predictCrowdLevel(stop, stopTime);
        
        // Generate optimization suggestions for this stop
        const stopSuggestions = await generateStopSuggestions(
          stop, 
          stopTime, 
          vibeAlignment, 
          energyLevel, 
          crowdPrediction,
          i,
          stops.length
        );
        
        suggestions.push(...stopSuggestions);
        energyProgression.push(energyLevel);
        
        optimizedStops.push({
          originalStop: stop,
          vibeAlignment,
          energyLevel,
          crowdPrediction,
          suggestedTime: generateOptimalTiming(stop, stopTime, i, stops.length, optimizeFor),
          suggestedVenue: await generateVenueSuggestion(stop, groupVibes, vibeAlignment)
        });
      }

      // Analyze overall vibe flow
      const overallVibeFlow = analyzeVibeFlow(optimizedStops, energyProgression);
      
      // Generate time optimization
      const timeOptimization = optimizeTimeline(optimizedStops, currentTime, includeTransit);
      
      // Analyze group compatibility
      const groupCompatibility = analyzeGroupCompatibility(participants, groupVibes, optimizedStops);
      
      // Generate high-level suggestions
      const highLevelSuggestions = generateHighLevelSuggestions(
        overallVibeFlow,
        timeOptimization,
        groupCompatibility,
        optimizeFor
      );
      
      suggestions.push(...highLevelSuggestions);

      return {
        optimizedStops,
        suggestions: suggestions.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }),
        overallVibeFlow,
        timeOptimization,
        groupCompatibility
      };
    },
    enabled: !stopsLoading && !participantsLoading && stops.length > 0 && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    optimization,
    loading: stopsLoading || participantsLoading || optimizationLoading,
    error: error?.message || null,
    hasStops: stops.length > 0,
    hasParticipants: participants.length > 0
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

function calculateStopVibeAlignment(stop: PlanStop, groupVibes: Vibe[]): number {
  // Analyze how well the stop aligns with group vibes
  const stopVibe = inferStopVibe(stop);
  let maxAlignment = 0;
  
  for (const groupVibe of groupVibes) {
    const alignment = calculateVibeCompatibility(groupVibe, stopVibe);
    maxAlignment = Math.max(maxAlignment, alignment);
  }
  
  return maxAlignment;
}

function calculateVibeCompatibility(vibe1: Vibe, vibe2: Vibe): number {
  const compatibility: Record<Vibe, Record<Vibe, number>> = {
    social: { social: 1.0, energetic: 0.8, chill: 0.6, creative: 0.7, adventurous: 0.8, focused: 0.3, romantic: 0.6, mysterious: 0.4 },
    energetic: { energetic: 1.0, social: 0.8, adventurous: 0.9, creative: 0.7, chill: 0.2, focused: 0.4, romantic: 0.5, mysterious: 0.6 },
    chill: { chill: 1.0, social: 0.6, creative: 0.8, romantic: 0.7, focused: 0.6, energetic: 0.2, adventurous: 0.3, mysterious: 0.5 },
    creative: { creative: 1.0, chill: 0.8, social: 0.7, mysterious: 0.8, focused: 0.7, energetic: 0.7, adventurous: 0.6, romantic: 0.6 },
    adventurous: { adventurous: 1.0, energetic: 0.9, social: 0.8, mysterious: 0.7, creative: 0.6, romantic: 0.4, chill: 0.3, focused: 0.2 },
    focused: { focused: 1.0, creative: 0.7, chill: 0.6, mysterious: 0.5, social: 0.3, romantic: 0.4, energetic: 0.4, adventurous: 0.2 },
    romantic: { romantic: 1.0, chill: 0.7, mysterious: 0.8, creative: 0.6, social: 0.6, focused: 0.4, energetic: 0.5, adventurous: 0.4 },
    mysterious: { mysterious: 1.0, romantic: 0.8, creative: 0.8, focused: 0.5, adventurous: 0.7, chill: 0.5, social: 0.4, energetic: 0.6 }
  };
  
  return compatibility[vibe1]?.[vibe2] || 0.5;
}

function inferStopVibe(stop: PlanStop): Vibe {
  // Infer vibe from venue type, title, or description
  const text = `${stop.title} ${stop.description || ''}`.toLowerCase();
  
  if (text.includes('bar') || text.includes('club') || text.includes('party')) return 'energetic';
  if (text.includes('cafe') || text.includes('coffee') || text.includes('park')) return 'chill';
  if (text.includes('museum') || text.includes('art') || text.includes('gallery')) return 'creative';
  if (text.includes('restaurant') || text.includes('dinner') || text.includes('social')) return 'social';
  if (text.includes('adventure') || text.includes('outdoor') || text.includes('activity')) return 'adventurous';
  if (text.includes('romantic') || text.includes('intimate') || text.includes('date')) return 'romantic';
  if (text.includes('mysterious') || text.includes('hidden') || text.includes('secret')) return 'mysterious';
  if (text.includes('work') || text.includes('study') || text.includes('focus')) return 'focused';
  
  return 'social'; // Default
}

function calculateEnergyLevel(stop: PlanStop, time: Date, index: number, totalStops: number): number {
  const hour = time.getHours();
  const stopVibe = inferStopVibe(stop);
  const positionFactor = index / Math.max(1, totalStops - 1); // 0 to 1
  
  // Base energy by vibe
  const vibeEnergy: Record<Vibe, number> = {
    energetic: 0.9,
    adventurous: 0.8,
    social: 0.7,
    creative: 0.6,
    mysterious: 0.6,
    romantic: 0.5,
    chill: 0.3,
    focused: 0.4
  };
  
  let energy = vibeEnergy[stopVibe];
  
  // Time of day modifiers
  if (hour >= 20 || hour <= 2) energy += 0.1; // Night energy boost
  if (hour >= 6 && hour <= 10) energy -= 0.2; // Morning energy dip
  
  // Position in plan (energy should generally increase then decrease)
  if (positionFactor < 0.3) energy -= 0.1; // Start slower
  if (positionFactor > 0.7) energy -= 0.2; // Wind down
  
  return Math.max(0, Math.min(1, energy));
}

async function predictCrowdLevel(stop: PlanStop, time: Date) {
  // Simple crowd prediction based on time and venue type
  const hour = time.getHours();
  const dayOfWeek = time.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  let expectedBusyness = 0.5;
  let peakTime = '8:00 PM';
  
  const stopVibe = inferStopVibe(stop);
  
  if (stopVibe === 'energetic') {
    expectedBusyness = isWeekend ? 0.8 : 0.6;
    peakTime = '10:00 PM';
    if (hour >= 21 && hour <= 2) expectedBusyness += 0.2;
  } else if (stopVibe === 'social') {
    expectedBusyness = 0.7;
    peakTime = '7:00 PM';
    if (hour >= 18 && hour <= 21) expectedBusyness += 0.1;
  } else if (stopVibe === 'chill') {
    expectedBusyness = 0.4;
    peakTime = '3:00 PM';
    if (hour >= 14 && hour <= 17) expectedBusyness += 0.1;
  }
  
  const compatibility = expectedBusyness < 0.8 ? 0.8 : 0.4; // Less busy is more compatible
  
  return {
    expectedBusyness: Math.min(1, expectedBusyness),
    peakTime,
    compatibility
  };
}

async function generateStopSuggestions(
  stop: PlanStop,
  time: Date,
  vibeAlignment: number,
  energyLevel: number,
  crowdPrediction: any,
  index: number,
  totalStops: number
): Promise<PlanOptimizationSuggestion[]> {
  const suggestions: PlanOptimizationSuggestion[] = [];
  
  // Vibe alignment suggestions
  if (vibeAlignment < 0.5) {
    suggestions.push({
      type: 'venue',
      priority: 'high',
      title: 'Poor vibe match',
      description: `This stop doesn't align well with your group's vibe preferences`,
      impact: 'Could reduce group satisfaction',
      confidence: 0.8,
      stopId: stop.id
    });
  }
  
  // Timing suggestions
  if (crowdPrediction.expectedBusyness > 0.8) {
    suggestions.push({
      type: 'timing',
      priority: 'medium',
      title: 'Peak crowd time',
      description: `This venue will be very busy at ${time.toLocaleTimeString()}`,
      impact: 'Consider shifting time to avoid crowds',
      confidence: 0.7,
      stopId: stop.id
    });
  }
  
  // Energy flow suggestions
  if (index > 0 && energyLevel > 0.8 && index < totalStops - 1) {
    suggestions.push({
      type: 'energy_flow',
      priority: 'low',
      title: 'High energy placement',
      description: 'This high-energy stop might work better later in the plan',
      impact: 'Optimize energy progression',
      confidence: 0.6,
      stopId: stop.id
    });
  }
  
  return suggestions;
}

function generateOptimalTiming(
  stop: PlanStop,
  currentTime: Date,
  index: number,
  totalStops: number,
  optimizeFor: string
) {
  const duration = stop.duration_minutes || 120; // 2 hours default
  const startTime = new Date(currentTime);
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
  
  const reasoning: string[] = [];
  
  // Adjust based on optimization preference
  if (optimizeFor === 'energy') {
    // Place high-energy activities in prime time
    const stopVibe = inferStopVibe(stop);
    if (stopVibe === 'energetic' && startTime.getHours() < 20) {
      startTime.setHours(20, 0, 0, 0);
      endTime.setTime(startTime.getTime() + duration * 60 * 1000);
      reasoning.push('Moved to prime energy hours');
    }
  } else if (optimizeFor === 'time') {
    // Minimize total duration
    const reducedDuration = Math.max(60, duration * 0.8);
    endTime.setTime(startTime.getTime() + reducedDuration * 60 * 1000);
    reasoning.push('Reduced duration to optimize timeline');
  }
  
  return {
    start: startTime,
    end: endTime,
    reasoning
  };
}

async function generateVenueSuggestion(stop: PlanStop, groupVibes: Vibe[], vibeAlignment: number) {
  if (vibeAlignment > 0.7) return undefined; // Current venue is good
  
  // This would integrate with actual venue recommendation system
  return {
    id: 'suggested-venue-' + Math.random(),
    name: 'AI Suggested Alternative',
    category: 'Better Match',
    vibeMatch: 0.9,
    reasoning: ['Better vibe alignment', 'Improved group compatibility', 'Optimal timing']
  };
}

function analyzeVibeFlow(optimizedStops: OptimizedStop[], energyProgression: number[]) {
  const avgVibeAlignment = optimizedStops.reduce((sum, stop) => sum + stop.vibeAlignment, 0) / optimizedStops.length;
  const energyVariance = calculateVariance(energyProgression);
  
  let analysis = '';
  if (avgVibeAlignment > 0.7) {
    analysis = 'Excellent vibe flow - all stops align well with group preferences';
  } else if (avgVibeAlignment > 0.5) {
    analysis = 'Good vibe flow with some opportunities for improvement';
  } else {
    analysis = 'Vibe flow needs optimization - several stops don\'t match group preferences';
  }
  
  return {
    score: avgVibeAlignment,
    analysis,
    energyProgression
  };
}

function optimizeTimeline(optimizedStops: OptimizedStop[], startTime: Date, includeTransit: boolean) {
  const totalDuration = optimizedStops.reduce((sum, stop) => {
    const duration = stop.originalStop?.duration_minutes || 120;
    return sum + duration + (includeTransit ? 30 : 0); // Add 30min transit between stops
  }, 0);
  
  return {
    totalDuration,
    suggestedStartTime: startTime,
    transitOptimized: includeTransit,
    bufferTime: includeTransit ? optimizedStops.length * 30 : 0
  };
}

function analyzeGroupCompatibility(participants: any[], groupVibes: Vibe[], optimizedStops: OptimizedStop[]) {
  // Simplified group compatibility analysis
  const score = optimizedStops.reduce((sum, stop) => sum + stop.vibeAlignment, 0) / optimizedStops.length;
  
  const conflicts: string[] = [];
  const harmonization: string[] = [];
  
  if (score < 0.5) {
    conflicts.push('Several stops don\'t match group preferences');
  }
  
  if (score > 0.8) {
    harmonization.push('Excellent alignment with group vibes');
  }
  
  return {
    score,
    conflicts,
    harmonization
  };
}

function generateHighLevelSuggestions(
  vibeFlow: any,
  timeOptimization: any,
  groupCompatibility: any,
  optimizeFor: string
): PlanOptimizationSuggestion[] {
  const suggestions: PlanOptimizationSuggestion[] = [];
  
  if (vibeFlow.score < 0.6) {
    suggestions.push({
      type: 'venue',
      priority: 'high',
      title: 'Improve overall vibe flow',
      description: 'Consider replacing some venues to better match group preferences',
      impact: 'Significantly improve group satisfaction',
      confidence: 0.8
    });
  }
  
  if (timeOptimization.totalDuration > 8 * 60) { // More than 8 hours
    suggestions.push({
      type: 'duration',
      priority: 'medium',
      title: 'Long plan duration',
      description: 'This plan might be too long - consider reducing stop durations',
      impact: 'Prevent group fatigue',
      confidence: 0.7
    });
  }
  
  return suggestions;
}

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
}