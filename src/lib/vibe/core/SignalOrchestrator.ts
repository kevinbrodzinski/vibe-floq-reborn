// Signal orchestrator - coordinates all vibe signal collectors
import type { SignalSnapshot, SignalCollector, VibePoint, VibeEngineState } from '@/types/vibe';

// Timeout helper for hanging collectors
async function withTimeout<T>(p: Promise<T>, ms = 1500): Promise<T | null> {
  return await Promise.race([
    p,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms))
  ]);
}

export class SignalOrchestrator {
  private snapshots: SignalSnapshot[] = [];
  private collectors = new Map<string, SignalCollector>();
  private maxSnapshots = 120; // 10 minutes at 5s intervals
  private listeners: Array<(state: VibeEngineState) => void> = [];
  private collectionTimer: ReturnType<typeof setTimeout> | null = null;
  private isActive = false;

  constructor() {
    // Start collection loop
    this.startCollection();
  }

  // Stop collection and cleanup resources
  stop() {
    if (!this.isActive) return; // idempotent
    this.isActive = false;
    if (this.collectionTimer) {
      clearTimeout(this.collectionTimer);
      this.collectionTimer = null;
    }
  }

  // Complete cleanup - stop collection and clear all data
  dispose() {
    this.stop();
    
    // Stop environmental collectors specifically (battery hygiene)
    for (const [name, collector] of this.collectors) {
      if (typeof (collector as any).stop === 'function') {
        try {
          (collector as any).stop();
        } catch (error) {
          console.warn(`Failed to stop collector ${name}:`, error);
        }
      }
    }
    
    this.listeners.length = 0;
    this.snapshots.length = 0;
    this.collectors.clear();
  }

  // Register a signal collector
  registerCollector(collector: SignalCollector) {
    this.collectors.set(collector.name, collector);
  }

  // Remove a signal collector
  unregisterCollector(name: string) {
    this.collectors.delete(name);
  }

  // Add state change listener - returns unsubscribe function
  addListener(callback: (state: VibeEngineState) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
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
    if (this.isActive) return; // idempotent
    this.isActive = true;
    
    const tick = async () => {
      if (!this.isActive) return;
      await this.stepOnceSafe();
      if (this.isActive) {
        this.collectionTimer = setTimeout(tick, 5000);
      }
    };

    tick();
  }

  // Single collection step with error safety
  private async stepOnceSafe() {
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
  }

  // Collect signals from all registered collectors
  private async collectSnapshot(): Promise<SignalSnapshot | null> {
    const sources: any = {};
    const availability: Record<string, boolean> = {};
    let totalQuality = 0;
    let qualityCount = 0;

    // Collect from all available collectors with timeout protection
    for (const [name, collector] of this.collectors) {
      try {
        const isAvailable = collector.isAvailable();
        availability[name] = isAvailable;

        if (isAvailable) {
          const signal = await withTimeout(collector.collect(), 1500);
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

  // Calculate energy from recent snapshots with explicit weight management
  private calculateEnergy(snapshots: SignalSnapshot[]): number {
    let totalEnergy = 0;
    let totalWeight = 0;

    for (const snapshot of snapshots) {
      const weight = snapshot.quality;
      let snapshotEnergy = 0; // Start from 0 baseline

      // Location contributes to energy
      if (snapshot.sources.location) {
        const loc = snapshot.sources.location;
        // TODO(tiles): replace temp urban density heuristic with POI/tiles signal.
        // Keep weight <= 0.05 until real data is wired.
        snapshotEnergy += Math.max(0, Math.min(1, loc.urbanDensity)) * 0.05;
        // Venues boost energy (main location signal)
        if (loc.venue) {
          snapshotEnergy += Math.max(0, Math.min(1, loc.venue.confidence)) * 0.15;
        }
      }

      // Movement contributes to energy
      if (snapshot.sources.movement) {
        const mov = snapshot.sources.movement;
        snapshotEnergy += mov.activity === 'walking' ? 0.15
                       : mov.activity === 'transit' ? 0.08
                       : 0;
      }

      // Temporal context contributes
      if (snapshot.sources.temporal) {
        const temp = snapshot.sources.temporal;
        snapshotEnergy += (temp.hourOfDay >= 18 && temp.hourOfDay <= 23 ? 0.12 : 0)
                       + (temp.isWeekend ? 0.05 : 0);
      }

      // Behavioral patterns contribute
      if (snapshot.sources.behavioral?.patternMatch) {
        const pm = snapshot.sources.behavioral.patternMatch;
        const base = pm.type === 'social-night' ? 0.18
                  : pm.type === 'adventure' ? 0.15
                  : pm.type === 'exploration' ? 0.12
                  : 0.08;
        snapshotEnergy += base * Math.max(0, Math.min(1, pm.confidence));
      }

      // Clamp snapshot energy and add to total
      snapshotEnergy = Math.max(0, Math.min(1, snapshotEnergy));
      totalEnergy += snapshotEnergy * weight;
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