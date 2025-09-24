import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useCloseEncounterToast() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`encounter_${user.id}`)
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'crossed_paths',
          filter: `user_a=eq.${user.id}`
        },
        ({ new: row }: { new: any }) => {
          toast({
            title: 'Ran into a friend!',
            description: `You and ${row.user_b.slice(0, 8)}... were nearby at ${
              new Date(row.ts).toLocaleTimeString()
            }`
          });
        }
      )
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public', 
          table: 'crossed_paths',
          filter: `user_b=eq.${user.id}`
        },
        ({ new: row }: { new: any }) => {
          toast({
            title: 'Ran into a friend!',
            description: `You and ${row.user_a.slice(0, 8)}... were nearby at ${
              new Date(row.ts).toLocaleTimeString()
            }`
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);
}