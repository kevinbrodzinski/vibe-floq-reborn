import { CorrectionStore } from '../storage/CorrectionStore';
import { loadPersonalDelta, applyPersonalDelta } from './PersonalWeightStore';
import { VenuePatternAnalyzer } from '../analysis/VenuePatternAnalyzer';
import { SequenceDetector } from '../analysis/SequenceDetector';
import { AdvancedTemporalAnalyzer } from '../analysis/AdvancedTemporalAnalyzer';
import type { PersonalityInsights } from '@/types/personality';
import type { Vibe } from '@/lib/vibes';
import { VIBES } from '@/lib/vibes';

/**
 * Main class that learns from user corrections and builds personality insights
 */
export class UserLearningSystem {
  private correctionStore = CorrectionStore;
  private venueAnalyzer = new VenuePatternAnalyzer();
  private sequenceDetector = new SequenceDetector();
  private temporalAnalyzer = new AdvancedTemporalAnalyzer();

  async getPersonalityInsights(): Promise<PersonalityInsights> {
    const recent = this.correctionStore.recent(100);
    const hasEnoughData = recent.length >= 15;

    if (!hasEnoughData) {
      return {
        hasEnoughData: false,
        chronotype: 'balanced',
        energyType: 'balanced',
        socialType: 'balanced',
        consistency: 'adaptive',
        confidence: 0,
        lastUpdated: Date.now(),
        dataQuality: 'low'
      };
    }

    // Basic personality analysis
    const chronotype = this.analyzeChronotype(recent);
    const energyType = this.analyzeEnergyType(recent);
    const socialType = this.analyzeSocialType(recent);
    const consistency = this.analyzeConsistency(recent);
    const temporalPrefs = this.buildTemporalPreferences(recent);
    const confidence = Math.min(1, recent.length / 50);

    // Enhanced pattern analysis
    const venueImpacts = this.venueAnalyzer.analyzeVenueImpact(recent);
    const behaviorSequences = this.sequenceDetector.detectSequences(recent);
    const triggerPatterns = this.sequenceDetector.detectTriggers(recent);
    const microTemporalPatterns = this.temporalAnalyzer.analyzeMicroTemporalPatterns(recent);
    const weeklyPatterns = this.temporalAnalyzer.analyzeWeeklyPatterns(recent);
    const temporalInsights = this.temporalAnalyzer.generateTemporalInsights(
      microTemporalPatterns, 
      weeklyPatterns, 
      recent
    );

    const insights: PersonalityInsights = {
      hasEnoughData,
      chronotype,
      energyType,
      socialType,
      consistency,
      temporalPrefs,
      confidence,
      lastUpdated: Date.now(),
      dataQuality: hasEnoughData ? 'high' : recent.length > 15 ? 'medium' : 'low',
      // Enhanced pattern data
      venueImpacts,
      behaviorSequences,
      triggerPatterns,
      temporalInsights,
      microTemporalPatterns
    };

    return insights;
  }

  private analyzeChronotype(corrections: any[]): 'lark' | 'owl' | 'balanced' {
    const timeVibes = corrections.reduce((acc, c) => {
      const hour = c.context.hourOfDay;
      if (hour <= 10) acc.morning++;
      else if (hour >= 20) acc.evening++;
      else acc.midday++;
      return acc;
    }, { morning: 0, midday: 0, evening: 0 });

    if (timeVibes.morning > timeVibes.evening * 1.5) return 'lark';
    if (timeVibes.evening > timeVibes.morning * 1.5) return 'owl';
    return 'balanced';
  }

  private analyzeEnergyType(corrections: any[]): 'high-energy' | 'low-energy' | 'balanced' {
    const energyVibes = ['hype', 'social', 'flowing'];
    const calmVibes = ['chill', 'solo', 'down'];
    
    const energyCount = corrections.filter(c => energyVibes.includes(c.corrected)).length;
    const calmCount = corrections.filter(c => calmVibes.includes(c.corrected)).length;
    
    if (energyCount > calmCount * 1.5) return 'high-energy';
    if (calmCount > energyCount * 1.5) return 'low-energy';
    return 'balanced';
  }

  private analyzeSocialType(corrections: any[]): 'social' | 'solo' | 'balanced' {
    const socialVibes = ['social', 'open', 'hype'];
    const soloVibes = ['solo', 'chill', 'focused'];
    
    const socialCount = corrections.filter(c => socialVibes.includes(c.corrected)).length;
    const soloCount = corrections.filter(c => soloVibes.includes(c.corrected)).length;
    
    if (socialCount > soloCount * 1.3) return 'social';
    if (soloCount > socialCount * 1.3) return 'solo';
    return 'balanced';
  }

  private analyzeConsistency(corrections: any[]): 'very-consistent' | 'consistent' | 'adaptive' | 'highly-adaptive' {
    const vibeFreqs = corrections.reduce((acc, c) => {
      acc[c.corrected] = (acc[c.corrected] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = corrections.length;
    const topVibe = Math.max(...Object.values(vibeFreqs).map(v => Number(v))) / total;
    
    if (topVibe > 0.6) return 'very-consistent';
    if (topVibe > 0.4) return 'consistent';
    if (topVibe > 0.25) return 'adaptive';
    return 'highly-adaptive';
  }

  private buildTemporalPreferences(corrections: any[]): Record<number, Partial<Record<Vibe, number>>> {
    const hourlyPrefs: Record<number, Record<string, number>> = {};
    
    corrections.forEach(c => {
      const hour = c.context.hourOfDay;
      if (!hourlyPrefs[hour]) hourlyPrefs[hour] = {};
      hourlyPrefs[hour][c.corrected] = (hourlyPrefs[hour][c.corrected] || 0) + 1;
    });

    // Normalize to percentages
    const result: Record<number, Partial<Record<Vibe, number>>> = {};
    Object.entries(hourlyPrefs).forEach(([hour, vibes]) => {
      const total = Object.values(vibes).reduce((sum, count) => sum + count as number, 0);
      result[parseInt(hour)] = Object.fromEntries(
        Object.entries(vibes).map(([vibe, count]) => [vibe, (count as number) / total])
      ) as Partial<Record<Vibe, number>>;
    });

    return result;
  }
}