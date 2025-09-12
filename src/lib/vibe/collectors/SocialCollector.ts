/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SignalCollector, SocialSignal } from '@/types/vibe';
import { computeCohesion } from '@/lib/flow/hudSignals';

// Minimal interface your provider must expose
export type SocialProvider = {
  getFriendHeads: () => Array<{ lng: number; lat: number; t_head: string }>;
  getMyRecentPath: () => Array<{ lng: number; lat: number; t?: number }>;
  getConvergenceProb?: () => number | undefined;  // optional (0..1)
};

export class SocialCollector implements SignalCollector<SocialSignal> {
  readonly name = 'social';
  private readonly provider: SocialProvider;
  private lastSignal: SocialSignal | null = null;
  private lastAt = 0;

  constructor(provider: SocialProvider) { 
    this.provider = provider; 
  }

  isAvailable(): boolean { 
    return true; // privacy is enforced upstream
  }

  async collect(): Promise<SocialSignal | null> {
    const now = Date.now();
    if (now - this.lastAt < 10_000) return this.lastSignal; // 10s cadence

    const friendHeads = this.provider.getFriendHeads() ?? [];
    const myPath = this.provider.getMyRecentPath() ?? [];

    // Cohesion from your existing heuristic (spatial+temporal)
    const { cohesion, nearby } = computeCohesion({
      myPath,
      friendHeads: friendHeads.map(h => ({ lng: h.lng, lat: h.lat, t_head: h.t_head })),
      distM: 150,
      timeMin: 12,
    });

    const prob = this.provider.getConvergenceProb?.();
    const sig: SocialSignal = {
      nearbyFriends: nearby,
      cohesion01: Math.max(0, Math.min(1, cohesion)),
      convergenceProb01: typeof prob === 'number' ? Math.max(0, Math.min(1, prob)) : undefined,
      sampleCount: friendHeads.length,
      windowSec: 120,
    };

    this.lastSignal = sig;
    this.lastAt = now;
    return sig;
  }

  getQuality(): number {
    // Mild: more friend heads and cohesion == higher quality
    const q = this.lastSignal
      ? Math.min(1, 0.3 + 0.4 * this.lastSignal.cohesion01 + 0.3 * Math.min(1, this.lastSignal.sampleCount / 5))
      : 0.3;
    return q;
  }

  dispose?(): void {
    this.lastSignal = null;
  }
}