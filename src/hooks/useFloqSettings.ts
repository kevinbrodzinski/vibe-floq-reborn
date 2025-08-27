import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from '@/integrations/supabase/types';

type FloqDetailsReturn = Database['public']['Functions']['get_floq_full_details']['Returns'];

export interface FloqSettings {
  notifications_enabled: boolean;
  mention_permissions: 'all' | 'co-admins' | 'host';
  join_approval_required: boolean;
  activity_visibility: 'public' | 'members_only';
  welcome_message: string | null;
  pinned_note?: string | null;
}

export function useFloqSettings(floqId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<FloqSettings>({
    queryKey: ["floq-settings", floqId],
    queryFn: async (): Promise<FloqSettings> => {
      const { data, error } = await supabase
        .rpc('get_floq_full_details', { p_floq_id: floqId as any })
        .returns<FloqDetailsReturn>()
        .single();

      if (error) throw error;
      
      // Normalize data - could be array or object
      const details = Array.isArray(data) ? data[0] : data;
      if (!details) throw new Error('No floq details found');

      return {
        notifications_enabled: (details as any).notifications_enabled ?? true,
        mention_permissions: (details as any).mention_permissions ?? 'all',
        join_approval_required: (details as any).join_approval_required ?? false,
        activity_visibility: (details as any).activity_visibility ?? 'public',
        welcome_message: (details as any).welcome_message ?? '',
        pinned_note: (details as any).pinned_note ?? null,
      };
    },
    enabled: !!floqId,
    staleTime: 5000, // Reduced for active editing sessions
    gcTime: 60_000, // Garbage collect after 1 minute of inactivity
    placeholderData: (previousData) => previousData,
  });

  const mutation = useMutation({
    mutationFn: async (payload: Partial<FloqSettings>) => {
      const { data, error } = await supabase.functions.invoke('update-floq-settings', {
        body: { floq_id: floqId, ...payload },
      });

      if (error) throw error;
      return data as FloqSettings;
    },
    onSuccess: (data: FloqSettings) => {
      queryClient.setQueryData(["floq-settings", floqId], data);
      toast.dismiss(); // Prevent duplicate toasts
      toast.success('Settings saved successfully');
      
      // Announce to screen readers
      const announcer = document.querySelector('[aria-live="assertive"]');
      if (announcer) {
        announcer.textContent = 'Settings saved successfully';
        setTimeout(() => announcer.textContent = '', 1000);
      }
    },
    onError: (error: any) => {
      console.error('Failed to save settings:', error);
      queryClient.invalidateQueries({ queryKey: ["floq-settings", floqId] }); // Refetch on error
      toast.error(`Failed to save settings: ${error.message || 'Please try again.'}`);
    },
  });

  return {
    ...query,
    settings: query.data,
    saveSettings: mutation.mutateAsync,
    saving: mutation.isPending,
  };
}