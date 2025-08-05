import type { AnalysisContext } from './VibeAnalysisEngine';
import type { Vibe } from '@/lib/vibes';

export interface TemporalFactors {
  relevance: number; // 0-1 how much temporal context should influence
  description: string;
  vibeBoosts: Partial<Record<Vibe, number>>; // -0.5 to +0.5 multiplier adjustments
  energyPattern: number; // Expected energy level for this time
  socialPattern: number; // Expected social activity level
}

/**
 * Temporal Context System
 * 
 * Analyzes time-based patterns to provide context-aware vibe suggestions.
 * Considers time of day, day of week, and broader temporal patterns.
 */
export class TemporalContext {
  /**
   * Get temporal factors for the current context
   */
  getTemporalFactors(context: AnalysisContext): TemporalFactors {
    const timeFactors = this.getTimeOfDayFactors(context);
    const dayFactors = this.getDayOfWeekFactors(context);
    const combinedFactors = this.combineTemporalFactors(timeFactors, dayFactors, context);
    
    return combinedFactors;
  }

  /**
   * Analyze time-of-day patterns
   */
  private getTimeOfDayFactors(context: AnalysisContext): Partial<TemporalFactors> {
    const { timeOfDay, hourOfDay } = context;
    
    switch (timeOfDay) {
      case 'early-morning': // 5-8am
        return {
          relevance: 0.7,
          description: 'Early morning - typically quiet, low energy time',
          vibeBoosts: {
            chill: 0.3,
            solo: 0.2,
            down: 0.1,
            open: -0.2,
            social: -0.3,
            hype: -0.4
          },
          energyPattern: 0.2,
          socialPattern: 0.1
        };
        
      case 'morning': // 8am-12pm
        return {
          relevance: 0.6,
          description: 'Morning hours - building energy, productivity focus',
          vibeBoosts: {
            solo: 0.3,
            curious: 0.2,
            flowing: 0.1,
            open: 0.1,
            social: -0.1,
            down: -0.2
          },
          energyPattern: 0.5,
          socialPattern: 0.3
        };
        
      case 'afternoon': // 12-5pm
        return {
          relevance: 0.5,
          description: 'Afternoon - peak productivity and social activity',
          vibeBoosts: {
            curious: 0.2,
            solo: 0.1,
            social: 0.1,
            open: 0.1,
            down: -0.1
          },
          energyPattern: 0.7,
          socialPattern: 0.6
        };
        
      case 'evening': // 5-9pm
        return {
          relevance: 0.8,
          description: 'Evening - prime social and entertainment time',
          vibeBoosts: {
            social: 0.4,
            hype: 0.3,
            open: 0.2,
            flowing: 0.2,
            romantic: 0.1,
            solo: -0.2,
            down: -0.1
          },
          energyPattern: 0.8,
          socialPattern: 0.9
        };
        
      case 'night': // 9pm-12am
        return {
          relevance: 0.7,
          description: 'Night time - winding down, intimate settings',
          vibeBoosts: {
            chill: 0.3,
            romantic: 0.3,
            social: 0.1,
            down: 0.1,
            hype: -0.1,
            curious: -0.2
          },
          energyPattern: 0.4,
          socialPattern: 0.5
        };
        
      case 'late-night': // 12am-5am
        return {
          relevance: 0.9,
          description: 'Late night - deep focus or intimate moments',
          vibeBoosts: {
            down: 0.4,
            romantic: 0.3,
            weird: 0.2,
            solo: 0.2,
            chill: 0.1,
            social: -0.3,
            hype: -0.4,
            open: -0.3
          },
          energyPattern: 0.2,
          socialPattern: 0.2
        };
        
      default:
        return {
          relevance: 0.1,
          description: 'Unknown time context',
          vibeBoosts: {},
          energyPattern: 0.5,
          socialPattern: 0.5
        };
    }
  }

  /**
   * Analyze day-of-week patterns
   */
  private getDayOfWeekFactors(context: AnalysisContext): Partial<TemporalFactors> {
    const { dayOfWeek, isWeekend, hourOfDay } = context;
    
    if (isWeekend) {
      // Weekend patterns
      if (hourOfDay < 12) {
        return {
          relevance: 0.6,
          description: 'Weekend morning - relaxed, leisurely pace',
          vibeBoosts: {
            chill: 0.3,
            flowing: 0.2,
            open: 0.1,
            solo: -0.1
          },
          energyPattern: 0.4,
          socialPattern: 0.4
        };
      } else if (hourOfDay >= 17) {
        return {
          relevance: 0.8,
          description: 'Weekend evening - prime social time',
          vibeBoosts: {
            social: 0.4,
            hype: 0.3,
            open: 0.2,
            romantic: 0.1,
            solo: -0.2
          },
          energyPattern: 0.8,
          socialPattern: 0.9
        };
      } else {
        return {
          relevance: 0.5,
          description: 'Weekend afternoon - mixed activities',
          vibeBoosts: {
            open: 0.2,
            flowing: 0.1,
            social: 0.1
          },
          energyPattern: 0.6,
          socialPattern: 0.6
        };
      }
    } else {
      // Weekday patterns
      if (hourOfDay >= 9 && hourOfDay <= 17) {
        return {
          relevance: 0.8,
          description: 'Weekday work hours - focus and productivity',
          vibeBoosts: {
            solo: 0.4,
            curious: 0.3,
            social: -0.2,
            hype: -0.3,
            down: -0.1
          },
          energyPattern: 0.6,
          socialPattern: 0.3
        };
      } else if (hourOfDay >= 18 && hourOfDay <= 21) {
        return {
          relevance: 0.7,
          description: 'Weekday evening - post-work social time',
          vibeBoosts: {
            social: 0.3,
            chill: 0.2,
            flowing: 0.1,
            solo: -0.1
          },
          energyPattern: 0.6,
          socialPattern: 0.7
        };
      } else {
        return {
          relevance: 0.4,
          description: 'Weekday off-hours',
          vibeBoosts: {
            chill: 0.1,
            solo: 0.1
          },
          energyPattern: 0.4,
          socialPattern: 0.4
        };
      }
    }
  }

  /**
   * Combine time and day factors
   */
  private combineTemporalFactors(
    timeFactors: Partial<TemporalFactors>,
    dayFactors: Partial<TemporalFactors>,
    context: AnalysisContext
  ): TemporalFactors {
    // Weight time factors more heavily than day factors
    const timeWeight = 0.7;
    const dayWeight = 0.3;
    
    // Combine relevance
    const relevance = Math.min(1, 
      (timeFactors.relevance || 0) * timeWeight + 
      (dayFactors.relevance || 0) * dayWeight
    );
    
    // Combine descriptions
    const description = [timeFactors.description, dayFactors.description]
      .filter(Boolean)
      .join(', ');
    
    // Combine vibe boosts
    const allVibes: Vibe[] = ['chill', 'social', 'hype', 'solo', 'romantic', 'down', 'flowing', 'open', 'curious', 'weird'];
    const vibeBoosts: Partial<Record<Vibe, number>> = {};
    
    allVibes.forEach(vibe => {
      const timeBoost = timeFactors.vibeBoosts?.[vibe] || 0;
      const dayBoost = dayFactors.vibeBoosts?.[vibe] || 0;
      const combined = timeBoost * timeWeight + dayBoost * dayWeight;
      
      if (Math.abs(combined) > 0.05) { // Only include meaningful boosts
        vibeBoosts[vibe] = Math.max(-0.5, Math.min(0.5, combined));
      }
    });
    
    // Combine energy and social patterns
    const energyPattern = 
      (timeFactors.energyPattern || 0.5) * timeWeight + 
      (dayFactors.energyPattern || 0.5) * dayWeight;
      
    const socialPattern = 
      (timeFactors.socialPattern || 0.5) * timeWeight + 
      (dayFactors.socialPattern || 0.5) * dayWeight;
    
    // Add special cases
    const enhancedFactors = this.addSpecialCases(
      { relevance, description, vibeBoosts, energyPattern, socialPattern },
      context
    );
    
    return enhancedFactors;
  }

  /**
   * Add special temporal cases
   */
  private addSpecialCases(
    factors: TemporalFactors,
    context: AnalysisContext
  ): TemporalFactors {
    const { hourOfDay, dayOfWeek, timeOfDay } = context;
    
    // Friday/Saturday night boost
    if ((dayOfWeek === 5 || dayOfWeek === 6) && timeOfDay === 'night') {
      factors.relevance = Math.min(1, factors.relevance + 0.2);
      factors.vibeBoosts.hype = (factors.vibeBoosts.hype || 0) + 0.2;
      factors.vibeBoosts.social = (factors.vibeBoosts.social || 0) + 0.2;
      factors.description += ' (weekend night boost)';
    }
    
    // Sunday evening wind-down
    if (dayOfWeek === 0 && hourOfDay >= 18) {
      factors.vibeBoosts.chill = (factors.vibeBoosts.chill || 0) + 0.2;
      factors.vibeBoosts.down = (factors.vibeBoosts.down || 0) + 0.1;
      factors.vibeBoosts.social = (factors.vibeBoosts.social || 0) - 0.1;
      factors.description += ' (Sunday wind-down)';
    }
    
    // Monday morning blues
    if (dayOfWeek === 1 && timeOfDay === 'morning') {
      factors.vibeBoosts.down = (factors.vibeBoosts.down || 0) + 0.1;
      factors.vibeBoosts.solo = (factors.vibeBoosts.solo || 0) + 0.1;
      factors.description += ' (Monday morning)';
    }
    
    // Lunch time social boost
    if (hourOfDay >= 12 && hourOfDay <= 14 && !context.isWeekend) {
      factors.vibeBoosts.social = (factors.vibeBoosts.social || 0) + 0.1;
      factors.description += ' (lunch time)';
    }
    
    return factors;
  }
}