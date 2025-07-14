import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FloqSettings {
  notifications_enabled: boolean;
  mention_permissions: 'all' | 'co-admins' | 'host';
  join_approval_required: boolean;
  activity_visibility: 'public' | 'members_only';
  welcome_message: string | null;
}

export function useFloqSettings(floqId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["floq-settings", floqId],
    queryFn: async (): Promise<FloqSettings> => {
      const { data, error } = await supabase
        .rpc('get_floq_full_details', { p_floq_id: floqId })
        .single();

      if (error) throw error;

      return {
        notifications_enabled: data.notifications_enabled ?? true,
        mention_permissions: data.mention_permissions ?? 'all',
        join_approval_required: data.join_approval_required ?? false,
        activity_visibility: data.activity_visibility ?? 'public',
        welcome_message: data.welcome_message ?? null,
      };
    },
    enabled: !!floqId,
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: async (payload: Partial<FloqSettings>) => {
      const { data, error } = await supabase.functions.invoke('update-floq-settings', {
        body: { floq_id: floqId, ...payload },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["floq-settings", floqId], data);
      toast.success('Settings saved successfully');
    },
    onError: (error: any) => {
      console.error('Failed to save settings:', error);
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