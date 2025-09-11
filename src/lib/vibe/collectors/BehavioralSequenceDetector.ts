// Behavioral sequence detector - tracks venue transitions and patterns
import type { SignalCollector, BehavioralSignal } from '@/types/vibe';

interface VenueVisit {
  venue: string;
  category: string;
  duration: number; // minutes
  timestamp: number;
  coordinates?: { lat: number; lng: number };
}

export class BehavioralSequenceDetector implements SignalCollector {
  readonly name = 'behavioral';
  
  private venueHistory: VenueVisit[] = [];
  private maxHistoryLength = 20; // Keep last 20 venues
  private currentVenue: VenueVisit | null = null;
  private venueStartTime = Date.now();

  isAvailable(): boolean {
    // Always available, but quality depends on venue detection
    return true;
  }

  async collect(): Promise<BehavioralSignal | null> {
    try {
      // Update current venue duration
      if (this.currentVenue) {
        this.currentVenue.duration = (Date.now() - this.venueStartTime) / (1000 * 60);
      }

      // Get recent venue sequence
      const recentSequence = this.venueHistory.slice(-10); // Last 10 venues
      
      // Detect patterns in the sequence
      const patternMatch = this.detectPattern(recentSequence);
      
      // Classify transition type
      const transitionType = this.classifyTransition(recentSequence);

      return {
        venueSequence: recentSequence.map(v => ({
          venue: v.venue,
          category: v.category,
          duration: v.duration,
          timestamp: v.timestamp,
        })),
        patternMatch,
        transitionType,
      };
    } catch (error) {
      console.warn('Behavioral sequence detection failed:', error);
      return null;
    }
  }

  getQuality(): number {
    // Quality increases with more venue data
    const historyBonus = Math.min(0.4, this.venueHistory.length * 0.04);
    const baseQuality = 0.3;
    
    // Bonus if we have recent pattern detection
    const recentBonus = this.venueHistory.length > 2 ? 0.3 : 0;
    
    return Math.min(1, baseQuality + historyBonus + recentBonus);
  }

  // Update venue detection from external sources (like LocationCollector)
  updateVenue(venue: string, category: string, coordinates?: { lat: number; lng: number }) {
    const now = Date.now();
    
    // If this is a new venue, save the previous one
    if (this.currentVenue && this.currentVenue.venue !== venue) {
      this.currentVenue.duration = (now - this.venueStartTime) / (1000 * 60);
      this.venueHistory.push({ ...this.currentVenue });
      
      // Trim history
      if (this.venueHistory.length > this.maxHistoryLength) {
        this.venueHistory.shift();
      }
    }

    // Start tracking new venue
    if (!this.currentVenue || this.currentVenue.venue !== venue) {
      this.currentVenue = {
        venue,
        category,
        duration: 0,
        timestamp: now,
        coordinates,
      };
      this.venueStartTime = now;
    }
  }

  private detectPattern(sequence: VenueVisit[]): BehavioralSignal['patternMatch'] {
    if (sequence.length < 3) return undefined;

    // Define pattern signatures
    const patterns = {
      'social-night': {
        sequence: ['restaurant', 'bar', 'club'],
        variations: [['cafe', 'bar'], ['restaurant', 'bar'], ['bar', 'club']],
        confidence: 0.8,
      },
      'exploration': {
        sequence: ['cafe', 'shop', 'restaurant'],
        variations: [['shop', 'cafe'], ['museum', 'cafe'], ['park', 'cafe']],
        confidence: 0.7,
      },
      'routine': {
        sequence: ['cafe', 'office', 'cafe'],
        variations: [['home', 'office', 'home'], ['cafe', 'work']],
        confidence: 0.6,
      },
      'adventure': {
        sequence: ['park', 'restaurant', 'attraction'],
        variations: [['attraction', 'restaurant'], ['park', 'attraction']],
        confidence: 0.75,
      },
    };

    // Extract recent categories
    const recentCategories = sequence.slice(-5).map(v => v.category);
    
    // Check each pattern
    for (const [patternType, pattern] of Object.entries(patterns)) {
      // Check main sequence
      if (this.sequenceMatches(recentCategories, pattern.sequence)) {
        return {
          type: patternType as any,
          confidence: pattern.confidence,
        };
      }

      // Check variations
      for (const variation of pattern.variations) {
        if (this.sequenceMatches(recentCategories, variation)) {
          return {
            type: patternType as any,
            confidence: pattern.confidence * 0.8, // Lower confidence for variations
          };
        }
      }
    }

    return undefined;
  }

  private sequenceMatches(actual: string[], expected: string[]): boolean {
    if (actual.length < expected.length) return false;
    
    // Check if expected sequence appears in actual (in order, but not necessarily consecutive)
    let expectedIndex = 0;
    
    for (const category of actual) {
      if (category === expected[expectedIndex]) {
        expectedIndex++;
        if (expectedIndex === expected.length) return true;
      }
    }
    
    return false;
  }

  private classifyTransition(sequence: VenueVisit[]): BehavioralSignal['transitionType'] {
    if (sequence.length < 2) return undefined;

    const recent = sequence.slice(-2);
    const [prev, current] = recent;
    
    // Time between venues
    const timeBetweenMs = current.timestamp - (prev.timestamp + prev.duration * 60 * 1000);
    const timeBetweenMin = timeBetweenMs / (1000 * 60);

    // Quick transitions suggest spontaneous behavior
    if (timeBetweenMin < 5) {
      return 'spontaneous';
    }

    // Long planned gaps suggest planned behavior
    if (timeBetweenMin > 60) {
      return 'planned';
    }

    // Check for routine patterns (same venue at similar times)
    const isRoutine = this.venueHistory.some(v => 
      v.venue === current.venue && 
      Math.abs(new Date(v.timestamp).getHours() - new Date(current.timestamp).getHours()) < 2
    );

    return isRoutine ? 'routine' : 'spontaneous';
  }
}