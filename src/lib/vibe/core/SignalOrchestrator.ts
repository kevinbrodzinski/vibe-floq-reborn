// Signal orchestrator - coordinates all vibe signal collectors
import type { SignalSnapshot, SignalCollector, VibePoint, VibeEngineState } from '@/types/vibe';

export class SignalOrchestrator {
  private snapshots: SignalSnapshot[] = [];
  private collectors = new Map<string, SignalCollector>();
  private maxSnapshots = 120; // 10 minutes at 5s intervals
  private listeners: Array<(state: VibeEngineState) => void> = [];

  constructor() {
    // Start collection loop
    this.startCollection();
  }

  // Register a signal collector
  registerCollector(collector: SignalCollector) {
    this.collectors.set(collector.name, collector);
  }

  // Remove a signal collector
  unregisterCollector(name: string) {
    this.collectors.delete(name);
  }

  // Add state change listener
  addListener(callback: (state: VibeEngineState) => void) {
    this.listeners.push(callback);
  }

  removeListener(callback: (state: VibeEngineState) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Get current vibe point with confidence
  getVibePoint(): VibePoint {
    if (this.snapshots.length === 0) {
      return {
        t: Date.now(),
        energy: 0.3, // neutral baseline
        confidence: 0.1, // very low confidence
        sources: [],
      };
    }

    // Aggregate recent snapshots (last 60 seconds)
    const now = Date.now();
    const recentSnapshots = this.snapshots.filter(s => now - s.timestamp < 60000);
    
    if (recentSnapshots.length === 0) {
      return {
        t: now,
        energy: 0.3,
        confidence: 0.1,
        sources: [],
      };
    }

    // Calculate energy from signals
    const energy = this.calculateEnergy(recentSnapshots);
    const confidence = this.calculateConfidence(recentSnapshots);
    const sources = this.getActiveSources(recentSnapshots);

    return {
      t: now,
      energy,
      confidence,
      sources,
    };
  }

  // Get current engine state
  getState(): VibeEngineState {
    return {
      currentVibe: this.getVibePoint(),
      recentSnapshots: this.snapshots.slice(-10), // last 10 snapshots
      signalHealth: this.getSignalHealth(),
      lastUpdate: Date.now(),
    };
  }

  // Internal collection loop
  private async startCollection() {
    const collect = async () => {
      try {
        const snapshot = await this.collectSnapshot();
        if (snapshot) {
          this.snapshots.push(snapshot);
          
          // Trim old snapshots
          if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots = this.snapshots.slice(-this.maxSnapshots);
          }

          // Notify listeners
          const state = this.getState();
          this.listeners.forEach(listener => {
            try {
              listener(state);
            } catch (error) {
              console.warn('Vibe engine listener error:', error);
            }
          });
        }
      } catch (error) {
        console.warn('Vibe signal collection error:', error);
      }

      // Schedule next collection
      setTimeout(collect, 5000); // 5 second intervals
    };

    collect();
  }

  // Collect signals from all registered collectors
  private async collectSnapshot(): Promise<SignalSnapshot | null> {
    const sources: any = {};
    const availability: Record<string, boolean> = {};
    let totalQuality = 0;
    let qualityCount = 0;

    // Collect from all available collectors
    for (const [name, collector] of this.collectors) {
      try {
        const isAvailable = collector.isAvailable();
        availability[name] = isAvailable;

        if (isAvailable) {
          const signal = await collector.collect();
          if (signal) {
            sources[name] = signal;
            const quality = collector.getQuality();
            totalQuality += quality;
            qualityCount++;
          }
        }
      } catch (error) {
        console.warn(`Signal collector ${name} failed:`, error);
        availability[name] = false;
      }
    }

    // Must have at least one signal source
    if (qualityCount === 0) {
      return null;
    }

    return {
      timestamp: Date.now(),
      sources,
      quality: totalQuality / qualityCount,
      availability,
    };
  }

  // Calculate energy from recent snapshots
  private calculateEnergy(snapshots: SignalSnapshot[]): number {
    let totalEnergy = 0;
    let totalWeight = 0;

    for (const snapshot of snapshots) {
      const weight = snapshot.quality;
      let snapshotEnergy = 0.3; // baseline

      // Location contributes to energy
      if (snapshot.sources.location) {
        const loc = snapshot.sources.location;
        // Urban areas and interesting venues boost energy
        snapshotEnergy += loc.urbanDensity * 0.3;
        if (loc.venue) {
          snapshotEnergy += loc.venue.confidence * 0.2;
        }
      }

      // Movement contributes to energy
      if (snapshot.sources.movement) {
        const mov = snapshot.sources.movement;
        // Active movement boosts energy
        const activityBoost = mov.activity === 'walking' ? 0.2 : 
                             mov.activity === 'transit' ? 0.1 : 0;
        snapshotEnergy += activityBoost;
      }

      // Temporal context contributes
      if (snapshot.sources.temporal) {
        const temp = snapshot.sources.temporal;
        // Evening hours and weekends boost energy
        const hourBoost = temp.hourOfDay >= 18 && temp.hourOfDay <= 23 ? 0.2 : 0;
        const weekendBoost = temp.isWeekend ? 0.1 : 0;
        snapshotEnergy += hourBoost + weekendBoost;
      }

      // Behavioral patterns contribute
      if (snapshot.sources.behavioral?.patternMatch) {
        const pattern = snapshot.sources.behavioral.patternMatch;
        const patternBoost = pattern.type === 'social-night' ? 0.3 :
                           pattern.type === 'adventure' ? 0.25 :
                           pattern.type === 'exploration' ? 0.2 : 0.1;
        snapshotEnergy += patternBoost * pattern.confidence;
      }

      totalEnergy += Math.min(1, snapshotEnergy) * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.min(1, totalEnergy / totalWeight) : 0.3;
  }

  // Calculate confidence based on signal quality and availability
  private calculateConfidence(snapshots: SignalSnapshot[]): number {
    if (snapshots.length === 0) return 0.1;

    const avgQuality = snapshots.reduce((sum, s) => sum + s.quality, 0) / snapshots.length;
    const consistency = this.calculateConsistency(snapshots);
    const signalDiversity = this.calculateSignalDiversity(snapshots);

    // Confidence formula: quality * consistency * diversity
    return Math.min(1, avgQuality * consistency * signalDiversity);
  }

  // Calculate how consistent recent readings are
  private calculateConsistency(snapshots: SignalSnapshot[]): number {
    if (snapshots.length < 2) return 0.5;

    const energies = snapshots.map(s => this.calculateEnergy([s]));
    const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
    const variance = energies.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / energies.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    return Math.max(0.1, 1 - stdDev);
  }

  // Calculate signal diversity (more signal types = higher confidence)
  private calculateSignalDiversity(snapshots: SignalSnapshot[]): number {
    const allSignalTypes = new Set<string>();
    
    for (const snapshot of snapshots) {
      Object.keys(snapshot.sources).forEach(type => allSignalTypes.add(type));
    }

    const signalCount = allSignalTypes.size;
    // Normalize: 1 signal = 0.4, 2 = 0.6, 3 = 0.8, 4+ = 1.0
    return Math.min(1, 0.2 + signalCount * 0.2);
  }

  // Get list of active signal sources
  private getActiveSources(snapshots: SignalSnapshot[]): string[] {
    const sources = new Set<string>();
    
    for (const snapshot of snapshots) {
      Object.keys(snapshot.sources).forEach(type => sources.add(type));
    }

    return Array.from(sources);
  }

  // Get per-signal health scores
  private getSignalHealth(): Record<string, number> {
    const health: Record<string, number> = {};
    
    for (const [name, collector] of this.collectors) {
      try {
        health[name] = collector.isAvailable() ? collector.getQuality() : 0;
      } catch {
        health[name] = 0;
      }
    }

    return health;
  }
}