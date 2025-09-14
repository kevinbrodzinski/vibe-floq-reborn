export class RateLimiter {
  private tokens: number;
  private lastRefill = Date.now();
  
  constructor(private capacity: number, private refillPerSec: number) {
    this.tokens = capacity;
  }
  
  async take(): Promise<void> {
    for (;;) {
      this.refill();
      if (this.tokens >= 1) { 
        this.tokens -= 1; 
        return; 
      }
      await new Promise(r => setTimeout(r, 100)); // 100ms tick
    }
  }
  
  private refill() {
    const now = Date.now();
    const delta = (now - this.lastRefill) / 1000;
    const add = delta * this.refillPerSec;
    if (add > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + add);
      this.lastRefill = now;
    }
  }
}

export async function withBackoff<T>(fn: () => Promise<T>, max = 4, baseMs = 250) {
  let attempt = 0;
  let lastErr: any;
  
  while (attempt <= max) {
    try { 
      return await fn(); 
    } catch (e: any) {
      lastErr = e;
      const jitter = Math.random() * 0.25 + 0.75;
      await new Promise(r => setTimeout(r, baseMs * Math.pow(2, attempt) * jitter));
      attempt++;
    }
  }
  throw lastErr;
}