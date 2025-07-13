import { useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  message?: string;
}

export function useRateLimiter(config: RateLimitConfig) {
  const { toast } = useToast();
  const attempts = useRef<number[]>([]);

  const attempt = useCallback(() => {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Remove old attempts outside the time window and check limit in one operation
    attempts.current = attempts.current.filter(time => time > windowStart);
    
    // Check if we've exceeded the limit
    if (attempts.current.length >= config.maxAttempts) {
      const oldestAttempt = attempts.current[0];
      const timeUntilReset = Math.ceil((oldestAttempt + config.windowMs - now) / 1000);
      
      toast({
        title: "Too many attempts",
        description: config.message || `Please wait ${timeUntilReset} seconds before trying again`,
        variant: "destructive",
      });
      
      return false;
    }
    
    // Add current attempt and return success
    attempts.current.push(now);
    return true;
  }, [config, toast]);

  const reset = useCallback(() => {
    attempts.current = [];
  }, []);

  return { attempt, reset };
}