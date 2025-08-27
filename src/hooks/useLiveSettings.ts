import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LiveSettings } from '@/types/liveSettings';
import type { Database } from '@/integrations/supabase/types';

const key = ['live-settings'];

const DEFAULTS: LiveSettings = {
    live_scope: 'friends',
    live_auto_when: ['always'],
    live_accuracy: 'exact',
    live_muted_until: null,
    live_smart_flags: {}
};

export const useLiveSettings = () => {
    const qc = useQueryClient();

    const query = useQuery<LiveSettings>({
        queryKey: key,
        queryFn: async (): Promise<LiveSettings> => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('not-signed-in');

            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    live_scope,
                    live_auto_when,
                    live_accuracy,
                    live_muted_until,
                    live_smart_flags
                `)
                .eq('id', user.id as any)   // ← correct PK
                .returns<LiveSettings>()
                .maybeSingle();         // ← null instead of crash

            if (error) {
                console.error('Failed to fetch live settings:', error);
                return DEFAULTS;
            }

            return (data ?? DEFAULTS) as LiveSettings;
        },
        staleTime: 300_000, // 5 minutes - reduce DB hammering
        retry: false, // Don't retry if QueryClient isn't ready
    });

    const mutation = useMutation({
        mutationFn: async (patch: Partial<LiveSettings>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('not-signed-in');

            const { error } = await supabase
                .from('profiles')
                .update(patch as any)
                .eq('id', user.id as any);  // ← not profile_id 

            if (error) {
                console.error('Failed to update live settings:', error);
                throw error;
            }
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });

    return {
        ...query,
        save: mutation.mutateAsync,
        isSaving: mutation.isPending
    };
}; 