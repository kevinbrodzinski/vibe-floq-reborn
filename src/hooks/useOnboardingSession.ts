import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useOnboardingSession() {
  const start = useRef(performance.now());
  const marks = useRef<Record<string, number>>({});

  function mark(step: string) {
    marks.current[step] = performance.now();
  }

  async function complete(extra?: Record<string, unknown>) {
    const totalMs = performance.now() - start.current;
    
    // Optional: send analytics via events table (future implementation)
    // For now just return timing for achievement detection
    
    return totalMs;
  }

  return {
    mark,
    complete,
    get totalMs() {
      return performance.now() - start.current;
    },
  };
}
