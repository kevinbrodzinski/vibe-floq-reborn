/**
 * Hysteresis helper for anti-flicker behavior
 * Use dual thresholds to prevent rapid on/off switching
 */

export class Hysteresis {
  private counter = 0;

  constructor(
    private onFrames: number,   // Frames to stay ON before enabling
    private offFrames: number   // Frames to stay OFF before disabling  
  ) {}

  update(condition: boolean): boolean {
    if (condition) {
      this.counter = Math.min(this.onFrames, this.counter + 1);
    } else {
      this.counter = Math.max(-this.offFrames, this.counter - 1);
    }
    
    return this.counter >= this.onFrames;
  }

  get isOn(): boolean {
    return this.counter >= this.onFrames;
  }

  reset() {
    this.counter = 0;
  }
}

/**
 * Multiple hysteresis states manager
 * Useful for managing multiple layer visibility states
 */
export class MultiHysteresis {
  private states = new Map<string, Hysteresis>();

  constructor(
    private defaultOnFrames = 2,
    private defaultOffFrames = 3
  ) {}

  update(key: string, condition: boolean, onFrames?: number, offFrames?: number): boolean {
    let hysteresis = this.states.get(key);
    if (!hysteresis) {
      hysteresis = new Hysteresis(
        onFrames ?? this.defaultOnFrames,
        offFrames ?? this.defaultOffFrames
      );
      this.states.set(key, hysteresis);
    }

    return hysteresis.update(condition);
  }

  isOn(key: string): boolean {
    return this.states.get(key)?.isOn ?? false;
  }

  reset(key?: string) {
    if (key) {
      this.states.get(key)?.reset();
    } else {
      this.states.forEach(h => h.reset());
    }
  }

  clear() {
    this.states.clear();
  }
}