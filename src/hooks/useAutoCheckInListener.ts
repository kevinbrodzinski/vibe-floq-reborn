import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAutoCheckInListener(planId: string) {
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel('plan_checkin_ready')
      .on('broadcast', { event: 'plan_checkin_ready' }, ({ payload }) => {
        if (payload.plan_id !== planId) return;
        toast({
          title: '✓ Checked in',
          description: `Automatically checked in at stop`
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId, toast]);
}