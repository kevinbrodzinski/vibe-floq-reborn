import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePulseBadges = (profileId?: string) =>
  useQuery({
    queryKey: ['pulse-badges', profileId],
    enabled : !!profileId,
    queryFn : async () => {
      // TODO: wire to actual views when migrated
      return {
        activeFloqs      : 0,
        venuesDiscovered : 0
      };
    },
    staleTime: 60_000
  });