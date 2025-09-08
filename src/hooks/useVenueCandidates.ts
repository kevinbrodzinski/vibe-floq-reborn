import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useVenueCandidates() {
  return useCallback(async (args: {
    center: { lat: number; lng: number };
    when: string;
    groupSize?: number;
    budgetTier?: "$" | "$$" | "$$$" | "$$$$";
    categories?: string[];
  }) => {
    const { data, error } = await supabase.functions.invoke('ai-suggest-venues', {
      body: {
        center: args.center,
        when: args.when,
        groupSize: args.groupSize ?? 4,
        maxPriceTier: args.budgetTier ?? "$$$",
        categories: args.categories ?? [],
        limit: 24,
        radiusM: 2000
      }
    });
    
    if (error) {
      console.error('Venue candidates error:', error);
      const message = error?.message ?? error?.error?.message ?? 'Something went wrong on the server';
      throw new Error(message);
    }
    
    return data.venues || [];
  }, []);
}