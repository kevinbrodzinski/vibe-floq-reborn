import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useResolvePlanSlug(slug: string) {
  return useQuery({
    queryKey: ['resolve-plan-slug', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('resolve-plan-slug', {
        body: { slug }
      });
      
      if (error) throw error;
      if (!data?.plan_id) throw new Error('Plan not found');
      
      return data.plan_id;
    },
  });
}