import type { VibeCorrection } from '@/core/vibe/storage/CorrectionStore';
import type { Vibe } from '@/lib/vibes';
import { VIBE_ENERGY } from '@/core/vibe/vector';
import { getHour, getDow, getIsWeekend } from '@/core/vibe/analysis/ctx';

export type MicroTemporalPattern = {
  hour: number;
  vibePreferences: Record<Vibe, number>;
  energyLevel: number; // 0-1
  confidence: number;
  sampleSize: number;
  optimalFor: Vibe[]; // vibes that work best at this hour
};

export type WeeklyEnergyPattern = {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  averageEnergy: number;
  peakHours: number[];
  lowHours: number[];
  dominantVibes: Vibe[];
};

export type EnergyWindow = {
  type: 'peak' | 'moderate' | 'low';
  startHour: number;
  endHour: number;
  averageEnergy: number;
  recommendedVibes: Vibe[];
  confidence: number;
};

export type TemporalInsight = {
  chronotype: 'lark' | 'owl' | 'balanced';
  peakEnergyWindows: EnergyWindow[];
  creativeHours: number[];
  socialHours: number[];
  soloHours: number[];
  weekendDifference: {
    energyShift: number; // how much energy changes on weekends
    vibeShifts: Record<Vibe, number>; // how vibe preferences change
  };
};

export class AdvancedTemporalAnalyzer {
  private readonly MIN_SAMPLES_PER_HOUR = 2;
  private readonly ENERGY_WINDOW_SIZE = 2; // hours

  /**
   * Analyze micro-patterns within each hour of the day
   */
  analyzeMicroTemporalPatterns(corrections: VibeCorrection[]): MicroTemporalPattern[] {
    const hourlyData = new Map<number, {
      corrections: VibeCorrection[];
      vibes: Record<Vibe, number>;
      energyLevels: number[];
    }>();

    // Initialize hourly buckets
    for (let hour = 0; hour < 24; hour++) {
      hourlyData.set(hour, {
        corrections: [],
        vibes: {} as Record<Vibe, number>,
        energyLevels: []
      });
    }

    // Group corrections by hour
    corrections.forEach(correction => {
      const hour = getHour(correction);
      const data = hourlyData.get(hour)!;
      
      data.corrections.push(correction);
      data.vibes[correction.corrected] = (data.vibes[correction.corrected] || 0) + 1;
      
      // Calculate energy level of chosen vibe
      const energy = this.calculateVibeEnergy(correction.corrected);
      data.energyLevels.push(energy);
    });

    // Convert to MicroTemporalPattern objects
    return Array.from(hourlyData.entries())
      .map(([hour, data]) => {
        const sampleSize = data.corrections.length;
        if (sampleSize < this.MIN_SAMPLES_PER_HOUR) return null;

        const total = Object.values(data.vibes).reduce((sum, count) => sum + count, 0);
        const vibePreferences = Object.fromEntries(
          Object.entries(data.vibes).map(([vibe, count]) => [vibe, count / total])
        ) as Record<Vibe, number>;

        const averageEnergy = data.energyLevels.reduce((sum, e) => sum + e, 0) / sampleSize;
        const confidence = Math.min(1, sampleSize / 5);

        // Find optimal vibes for this hour (above average preference)
        const avgPreference = 1 / Object.keys(vibePreferences).length;
        const optimalFor = Object.entries(vibePreferences)
          .filter(([, preference]) => preference > avgPreference * 1.5)
          .map(([vibe]) => vibe as Vibe);

        return {
          hour,
          vibePreferences,
          energyLevel: averageEnergy,
          confidence,
          sampleSize,
          optimalFor
        };
      })
      .filter(Boolean) as MicroTemporalPattern[];
  }

  /**
   * Analyze weekly energy patterns and day-of-week differences
   */
  analyzeWeeklyPatterns(corrections: VibeCorrection[]): WeeklyEnergyPattern[] {
    const dailyData = new Map<number, {
      hourlyEnergy: Map<number, number[]>;
      vibes: Record<Vibe, number>;
    }>();

    // Initialize daily buckets
    for (let day = 0; day < 7; day++) {
      dailyData.set(day, {
        hourlyEnergy: new Map(),
        vibes: {} as Record<Vibe, number>
      });
    }

    // Group by day of week
    corrections.forEach(correction => {
      const date = new Date(correction.timestamp);
      const dayOfWeek = date.getDay();
      const hour = getHour(correction);
      
      const data = dailyData.get(dayOfWeek)!;
      
      // Track energy by hour
      if (!data.hourlyEnergy.has(hour)) {
        data.hourlyEnergy.set(hour, []);
      }
      data.hourlyEnergy.get(hour)!.push(this.calculateVibeEnergy(correction.corrected));
      
      // Track vibe frequencies
      data.vibes[correction.corrected] = (data.vibes[correction.corrected] || 0) + 1;
    });

    // Convert to WeeklyEnergyPattern objects
    return Array.from(dailyData.entries()).map(([dayOfWeek, data]) => {
      const hourlyAverages = new Map<number, number>();
      
      // Calculate average energy for each hour
      data.hourlyEnergy.forEach((energies, hour) => {
        if (energies.length > 0) {
          hourlyAverages.set(hour, energies.reduce((sum, e) => sum + e, 0) / energies.length);
        }
      });

      const allAverages = Array.from(hourlyAverages.values());
      const averageEnergy = allAverages.reduce((sum, avg) => sum + avg, 0) / allAverages.length;

      // Find peak and low hours
      const sortedHours = Array.from(hourlyAverages.entries())
        .sort(([,a], [,b]) => b - a);
      
      const peakHours = sortedHours.slice(0, 3).map(([hour]) => hour);
      const lowHours = sortedHours.slice(-3).map(([hour]) => hour);

      // Find dominant vibes
      const totalVibes = Object.values(data.vibes).reduce((sum, count) => sum + count, 0);
      const dominantVibes = Object.entries(data.vibes)
        .filter(([, count]) => count / totalVibes > 0.15) // At least 15% frequency
        .map(([vibe]) => vibe as Vibe);

      return {
        dayOfWeek,
        averageEnergy,
        peakHours,
        lowHours,
        dominantVibes
      };
    });
  }

  /**
   * Identify distinct energy windows and generate temporal insights
   */
  generateTemporalInsights(
    microPatterns: MicroTemporalPattern[],
    weeklyPatterns: WeeklyEnergyPattern[],
    corrections: VibeCorrection[]
  ): TemporalInsight {
    // Determine chronotype based on peak energy hours
    const chronotype = this.determineChronotype(microPatterns);
    
    // Identify energy windows
    const energyWindows = this.identifyEnergyWindows(microPatterns);
    
    // Find specialized hours for different activities
    const creativeHours = this.findCreativeHours(microPatterns);
    const socialHours = this.findSocialHours(microPatterns);
    const soloHours = this.findSoloHours(microPatterns);
    
    // Analyze weekend differences
    const weekendDifference = this.analyzeWeekendDifferences(corrections);

    return {
      chronotype,
      peakEnergyWindows: energyWindows,
      creativeHours,
      socialHours,
      soloHours,
      weekendDifference
    };
  }

  private calculateVibeEnergy(vibe: Vibe): number {
    return VIBE_ENERGY[vibe] || 0.5;
  }

  private determineChronotype(patterns: MicroTemporalPattern[]): 'lark' | 'owl' | 'balanced' {
    if (patterns.length < 6) return 'balanced'; // Not enough data

    // Find peak energy hour
    const peakPattern = patterns.reduce((max, pattern) => 
      pattern.energyLevel > max.energyLevel ? pattern : max
    );

    if (peakPattern.hour <= 10) return 'lark';
    if (peakPattern.hour >= 20) return 'owl';
    return 'balanced';
  }

  private identifyEnergyWindows(patterns: MicroTemporalPattern[]): EnergyWindow[] {
    if (patterns.length < 8) return [];

    const windows: EnergyWindow[] = [];
    const sortedPatterns = [...patterns].sort((a, b) => a.hour - b.hour);
    
    // Calculate energy thresholds
    const energyLevels = patterns.map(p => p.energyLevel);
    const avgEnergy = energyLevels.reduce((sum, e) => sum + e, 0) / energyLevels.length;
    const highThreshold = avgEnergy + 0.15;
    const lowThreshold = avgEnergy - 0.15;

    // Group consecutive hours into windows
    let currentWindow: { 
      type: 'peak' | 'moderate' | 'low'; 
      hours: number[]; 
      energies: number[];
      vibes: Vibe[];
    } | null = null;

    sortedPatterns.forEach(pattern => {
      const energyType = pattern.energyLevel > highThreshold ? 'peak' :
                        pattern.energyLevel < lowThreshold ? 'low' : 'moderate';

      if (!currentWindow || currentWindow.type !== energyType) {
        // Finish previous window
        if (currentWindow && currentWindow.hours.length >= 2) {
          windows.push(this.createEnergyWindow(currentWindow));
        }
        
        // Start new window
        currentWindow = {
          type: energyType,
          hours: [pattern.hour],
          energies: [pattern.energyLevel],
          vibes: pattern.optimalFor
        };
      } else {
        // Extend current window
        currentWindow.hours.push(pattern.hour);
        currentWindow.energies.push(pattern.energyLevel);
        currentWindow.vibes.push(...pattern.optimalFor);
      }
    });

    // Finish last window
    if (currentWindow && currentWindow.hours.length >= 2) {
      windows.push(this.createEnergyWindow(currentWindow));
    }

    return windows;
  }

  private createEnergyWindow(windowData: {
    type: 'peak' | 'moderate' | 'low';
    hours: number[];
    energies: number[];
    vibes: Vibe[];
  }): EnergyWindow {
    const avgEnergy = windowData.energies.reduce((sum, e) => sum + e, 0) / windowData.energies.length;
    
    // Find most recommended vibes for this window
    const vibeCounts = windowData.vibes.reduce((acc, vibe) => {
      acc[vibe] = (acc[vibe] || 0) + 1;
      return acc;
    }, {} as Record<Vibe, number>);

    const recommendedVibes = Object.entries(vibeCounts)
      .filter(([, count]) => count >= 2) // Mentioned at least twice
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([vibe]) => vibe as Vibe);

    return {
      type: windowData.type,
      startHour: Math.min(...windowData.hours),
      endHour: Math.max(...windowData.hours),
      averageEnergy: avgEnergy,
      recommendedVibes,
      confidence: Math.min(1, windowData.hours.length / 4)
    };
  }

  private findCreativeHours(patterns: MicroTemporalPattern[]): number[] {
    return patterns
      .filter(p => p.optimalFor.includes('curious' as Vibe) || p.optimalFor.includes('flowing' as Vibe))
      .filter(p => p.confidence > 0.4)
      .map(p => p.hour)
      .slice(0, 3);
  }

  private findSocialHours(patterns: MicroTemporalPattern[]): number[] {
    return patterns
      .filter(p => p.optimalFor.includes('social' as Vibe) || p.optimalFor.includes('open' as Vibe))
      .filter(p => p.confidence > 0.4)
      .map(p => p.hour)
      .slice(0, 3);
  }

  private findSoloHours(patterns: MicroTemporalPattern[]): number[] {
    return patterns
      .filter(p => p.optimalFor.includes('solo' as Vibe) || p.optimalFor.includes('chill' as Vibe))
      .filter(p => p.confidence > 0.4)
      .map(p => p.hour)
      .slice(0, 3);
  }

  private analyzeWeekendDifferences(corrections: VibeCorrection[]): {
    energyShift: number;
    vibeShifts: Record<Vibe, number>;
  } {
    const weekdayCorrections = corrections.filter(c => c.context.dayOfWeek % 6 !== 0);
    const weekendCorrections = corrections.filter(c => c.context.dayOfWeek % 6 === 0);

    if (weekdayCorrections.length < 5 || weekendCorrections.length < 3) {
      return { energyShift: 0, vibeShifts: {} as Record<Vibe, number> };
    }

    // Calculate average energy difference
    const weekdayEnergy = weekdayCorrections.reduce((sum, c) => 
      sum + this.calculateVibeEnergy(c.corrected), 0) / weekdayCorrections.length;
    const weekendEnergy = weekendCorrections.reduce((sum, c) => 
      sum + this.calculateVibeEnergy(c.corrected), 0) / weekendCorrections.length;

    const energyShift = weekendEnergy - weekdayEnergy;

    // Calculate vibe frequency differences
    const getVibeFreqs = (corrections: VibeCorrection[]) => {
      const total = corrections.length;
      return corrections.reduce((acc, c) => {
        acc[c.corrected] = (acc[c.corrected] || 0) + 1 / total;
        return acc;
      }, {} as Record<Vibe, number>);
    };

    const weekdayVibes = getVibeFreqs(weekdayCorrections);
    const weekendVibes = getVibeFreqs(weekendCorrections);

    const vibeShifts = Object.fromEntries(
      Object.keys({ ...weekdayVibes, ...weekendVibes }).map(vibe => [
        vibe,
        (weekendVibes[vibe] || 0) - (weekdayVibes[vibe] || 0)
      ])
    ) as Record<Vibe, number>;

    return { energyShift, vibeShifts };
  }
}