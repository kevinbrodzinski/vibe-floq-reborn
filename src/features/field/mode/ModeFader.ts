/**
 * ModeFader: Deterministic Live→Replay crossfade
 * Provides smooth alpha transitions between live and replay modes
 */
export class ModeFader {
  private a = 1;                 // live alpha
  private b = 0;                 // replay alpha
  private goal: 'live' | 'replay' = 'live';

  constructor(private ms = 220) {}

  setGoal(g: 'live' | 'replay') { 
    this.goal = g; 
  }

  update(deltaMS: number) {
    const step = Math.max(0.5, Math.min(2, deltaMS / 16)) * (16 / this.ms);
    
    if (this.goal === 'replay') {
      this.a = Math.max(0, this.a - step);
      this.b = Math.min(1, this.b + step);
    } else {
      this.a = Math.min(1, this.a + step);
      this.b = Math.max(0, this.b - step);
    }
  }

  get liveAlpha() { 
    return this.a; 
  }

  get replayAlpha() { 
    return this.b; 
  }

  get isTransitioning() {
    return this.a > 0.05 && this.b > 0.05;
  }
}