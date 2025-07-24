import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function usePlanCheckinToast(planId?:string){
  const { toast } = useToast();

  useEffect(()=>{
    if(!planId) return;
    const ch = supabase.channel(`checkin_${planId}`)
      .on('broadcast',{event:'plan_checkin_ready'}, ({payload})=>{
        if(payload.plan_id === planId){
          toast({
            title:'Checked-in ✅',
            description:'You were automatically checked-in to this stop'
          });
        }
      })
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[planId, toast]);
}