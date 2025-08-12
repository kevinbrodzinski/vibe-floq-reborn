import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAutoCheckInListener(planId: string) {
  const { toast } = useToast();

  useEffect(() => {
    if (!planId) return;

    const channel = supabase
      .channel(`plan_check_ins_listener_${planId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'plan_check_ins',
          filter: `plan_id=eq.${planId}`,
        },
        ({ new: row }: any) => {
          toast({
            title: '✓ Checked in',
            description: row?.title
              ? `Automatically checked in at ${row.title}`
              : 'Automatically checked in at stop',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId, toast]);
}