import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for seeding and managing demo presence data for testing
 * Creates realistic presence data around Venice Beach area
 */
export function usePresenceDemoData() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSeeded, setLastSeeded] = useState<Date | null>(null);
  const { toast } = useToast();

  const seedDemoData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('[Demo] Seeding presence data...');
      
      const { data, error } = await supabase.functions.invoke('seed_presence', {
        body: { count: 25 } // Seed 25 demo users
      });

      if (error) throw error;

      setLastSeeded(new Date());
      toast({
        title: "Demo data seeded",
        description: `Created ${data?.records || 25} demo presence records`,
      });

      console.log('[Demo] Seeded successfully:', data);
      return data;
    } catch (err) {
      console.info('[DemoSeed] unavailable – skipping:', err);
      toast({
        title: "Demo seeding unavailable",
        description: "Function authentication needed",
        variant: "destructive"
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearDemoData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Remove all demo records (those with profile_id starting with 'demo-user-')
      const { error } = await supabase
        .from('vibes_now')
        .delete()
        .like('profile_id', 'demo-user-%');

      if (error) throw error;

      setLastSeeded(null);
      toast({
        title: "Demo data cleared",
        description: "All demo presence records removed",
      });

      console.log('[Demo] Cleared successfully');
    } catch (error: any) {
      console.error('[Demo] Clear failed:', error);
      toast({
        title: "Demo clear failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    seedDemoData,
    clearDemoData,
    isLoading,
    lastSeeded,
  };
}