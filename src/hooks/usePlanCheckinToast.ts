import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function usePlanCheckinToast(planId?: string) {
  const { toast } = useToast();

  useEffect(() => {
    if (!planId) return;

    const channel = supabase.channel(`plan_check_ins_${planId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'plan_check_ins',
          filter: `plan_id=eq.${planId}`,
        },
        (payload: any) => {
          const row = payload.new || {};
          toast({
            title: 'Checked-in ✅',
            description: row.title
              ? `Auto-checked in at ${row.title}`
              : 'You were automatically checked-in to this stop',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId, toast]);
}