/**
 * Time-Lapse Ring Buffer
 * Memory-efficient 2-hour buffer using typed arrays (no object churn)
 */

export type TLFrame = {
  t: number;               // epoch ms
  flows: Float32Array;     // [x,y,vx,vy] * Nf (downsampled grid)
  storms: Float32Array;    // [x,y,intensity] * Ns
  aurora: Uint8Array;      // [activeCount]
};

export class TimeLapseBuffer {
  private frames: TLFrame[] = [];
  private head = 0;
  
  constructor(private capacity = 240) { // ~2h @ 30s intervals
    this.frames.length = capacity;
  }

  /** Insert a frame at head, overwriting oldest */
  push(frame: TLFrame) {
    this.frames[this.head] = frame;
    this.head = (this.head + 1) % this.capacity;
  }

  /** Get frame by index back from head: 0 = newest, capacity-1 = oldest */
  getBack(i: number): TLFrame | undefined {
    if (i >= this.capacity) return undefined;
    const idx = (this.head - 1 - i + this.capacity) % this.capacity;
    return this.frames[idx];
  }

  newest(): TLFrame | undefined { 
    return this.getBack(0); 
  }
  
  oldest(): TLFrame | undefined { 
    return this.getBack(this.capacity - 1); 
  }

  *iterNewToOld() { 
    for (let i = 0; i < this.capacity; i++) { 
      const f = this.getBack(i); 
      if (f) yield f; 
      else break; 
    } 
  }

  clear() { 
    this.frames = new Array(this.capacity); 
    this.head = 0; 
  }

  /**
   * Get buffer stats
   */
  getStats() {
    let validFrames = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.getBack(i)) validFrames++;
      else break;
    }
    
    return {
      capacity: this.capacity,
      validFrames,
      head: this.head,
      oldestTime: this.oldest()?.t,
      newestTime: this.newest()?.t
    };
  }
}