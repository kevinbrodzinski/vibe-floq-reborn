// Simple in-memory rate limiter for ping-friends
class RateLimiter {
  private tokens = new Map<string, { count: number; resetTime: number }>();
  private readonly maxTokens: number;
  private readonly windowMs: number;

  constructor(maxTokens = 5, windowMs = 60000) { // 5 per minute by default
    this.maxTokens = maxTokens;
    this.windowMs = windowMs;
  }

  take(key: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const bucket = this.tokens.get(key) || { count: 0, resetTime: now + this.windowMs };
    
    // Reset if window expired
    if (now >= bucket.resetTime) {
      bucket.count = 0;
      bucket.resetTime = now + this.windowMs;
    }
    
    if (bucket.count >= this.maxTokens) {
      this.tokens.set(key, bucket);
      return { allowed: false, remaining: 0 };
    }
    
    bucket.count++;
    this.tokens.set(key, bucket);
    return { allowed: true, remaining: this.maxTokens - bucket.count };
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, bucket] of this.tokens.entries()) {
      if (now >= bucket.resetTime + this.windowMs) {
        this.tokens.delete(key);
      }
    }
  }
}

// Global rate limiter instance
const pingRateLimiter = new RateLimiter(5, 60000); // 5 pings per minute

// Cleanup every 5 minutes
setInterval(() => pingRateLimiter.cleanup(), 5 * 60 * 1000);

export { pingRateLimiter };