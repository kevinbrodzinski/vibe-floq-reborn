import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export function useCloseEncounterToast() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`encounter_${profile.id}`)
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'user_encounter',
          filter: `user_low=eq.${profile.id}`
        },
        ({ new: row }: { new: any }) => {
          toast({
            title: 'Ran into a friend!',
            description: `You and ${row.user_b.slice(0, 8)}... were nearby at ${
              new Date(row.first_seen).toLocaleTimeString()
            }`
          });
        }
      )
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public', 
          table: 'user_encounter',
          filter: `user_high=eq.${profile.id}`
        },
        ({ new: row }: { new: any }) => {
          toast({
            title: 'Ran into a friend!',
            description: `You and ${row.user_a.slice(0, 8)}... were nearby at ${
              new Date(row.first_seen).toLocaleTimeString()
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