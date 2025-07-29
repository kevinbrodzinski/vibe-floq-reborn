import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LiveSettings } from '@/types/liveSettings';

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

    const query = useQuery({
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
                .eq('profile_id', user.id)   // ← correct PK
                .maybeSingle();         // ← null instead of crash

            if (error) {
                console.error('Failed to fetch live settings:', error);
                return DEFAULTS;
            }

            return (data ?? DEFAULTS) as LiveSettings;
        },
        staleTime: 60_000, // 1 minute
        retry: false, // Don't retry if QueryClient isn't ready
    });

    const mutation = useMutation({
        mutationFn: async (patch: Partial<LiveSettings>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('not-signed-in');

            const { error } = await supabase
                .from('profiles')
                .update(patch)
                .eq('profile_id', user.id);  // ← same here

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