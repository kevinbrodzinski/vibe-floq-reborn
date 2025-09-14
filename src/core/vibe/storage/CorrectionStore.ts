import type { Vibe } from "@/lib/vibes";
import type { ComponentScores, VibeReading } from "../types";

export interface VibeCorrection {
  id: string;
  timestamp: number;
  predicted: Vibe;
  corrected: Vibe;
  confidence: number;
  context: {
    components: ComponentScores;
    location?: { lat: number; lng: number };
    timeOfDay: number;
    dayOfWeek: number;
    venue?: string;
  };
  reason?: string;
}

export interface CorrectionPattern {
  component: keyof ComponentScores;
  vibe: Vibe;
  adjustmentDirection: number; // -1 to +1
  strength: number; // 0 to 1
  confidence: number;
}

class CorrectionStoreImpl {
  private readonly STORAGE_KEY = 'vibe_corrections_v1';
  private readonly MAX_CORRECTIONS = 500;

  async save(correction: VibeCorrection): Promise<void> {
    try {
      const existing = this.loadAll();
      const updated = [correction, ...existing].slice(0, this.MAX_CORRECTIONS);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('[CorrectionStore] Failed to save correction:', error);
    }
  }

  loadAll(): VibeCorrection[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  recent(limit: number = 50): VibeCorrection[] {
    return this.loadAll().slice(0, limit);
  }

  /**
   * Find patterns in user corrections to adjust component weights
   */
  analyzePatterns(): CorrectionPattern[] {
    const corrections = this.loadAll();
    if (corrections.length < 5) return [];

    const patterns: CorrectionPattern[] = [];
    const components = ['circadian', 'movement', 'venueEnergy', 'deviceUsage', 'weather'] as const;

    for (const component of components) {
      const vibeAdjustments: Record<Vibe, number[]> = {} as any;

      // Group corrections by the corrected vibe
      corrections.forEach(correction => {
        const correctedVibe = correction.corrected;
        if (!vibeAdjustments[correctedVibe]) {
          vibeAdjustments[correctedVibe] = [];
        }

        // Calculate how much this component should have influenced the corrected vibe
        const componentValue = correction.context.components[component] || 0;
        const shouldHaveInfluenced = componentValue > 0.6 ? 1 : componentValue > 0.3 ? 0.5 : 0;
        
        vibeAdjustments[correctedVibe].push(shouldHaveInfluenced);
      });

      // Find consistent patterns
      Object.entries(vibeAdjustments).forEach(([vibe, adjustments]) => {
        if (adjustments.length < 3) return;

        const mean = adjustments.reduce((s, a) => s + a, 0) / adjustments.length;
        const variance = adjustments.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / adjustments.length;
        
        // Only consider patterns with low variance (consistent corrections)
        if (variance < 0.2 && Math.abs(mean) > 0.1) {
          patterns.push({
            component,
            vibe: vibe as Vibe,
            adjustmentDirection: mean > 0 ? 1 : -1,
            strength: Math.abs(mean),
            confidence: Math.max(0, 1 - variance * 2)
          });
        }
      });
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Clear old corrections beyond retention limit
   */
  cleanup(): void {
    const corrections = this.loadAll();
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days
    
    const filtered = corrections.filter(c => c.timestamp > cutoff);
    if (filtered.length !== corrections.length) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    }
  }

  getStats() {
    const corrections = this.loadAll();
    const recent = corrections.filter(c => c.timestamp > Date.now() - (7 * 24 * 60 * 60 * 1000));
    
    return {
      total: corrections.length,
      recent: recent.length,
      patterns: this.analyzePatterns().length,
      accuracy: recent.length > 0 ? recent.filter(c => c.predicted === c.corrected).length / recent.length : 0
    };
  }
}

export const CorrectionStore = new CorrectionStoreImpl();