import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FloqSettings {
  notifications_enabled: boolean;
  mention_permissions: 'all' | 'co-admins' | 'host-only';
  join_approval_required: boolean;
  activity_visibility: 'public' | 'members_only';
  welcome_message: string | null;
}

export function useFloqSettings(floqId: string) {
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error
  } = useQuery({
    queryKey: ["floq-settings", floqId],
    queryFn: async (): Promise<FloqSettings> => {
      const { data, error } = await supabase
        .from('floq_settings')
        .select('*')
        .eq('floq_id', floqId)
        .maybeSingle();

      if (error) throw error;

      // Return defaults if no settings exist yet
      return {
        notifications_enabled: data?.notifications_enabled ?? true,
        mention_permissions: data?.mention_permissions ?? 'all',
        join_approval_required: data?.join_approval_required ?? false,
        activity_visibility: data?.activity_visibility ?? 'public',
        welcome_message: data?.welcome_message ?? '',
      };
    },
    staleTime: 30000, // 30 seconds
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<FloqSettings>) => {
      const { error } = await supabase.functions.invoke('update-floq-settings', {
        body: {
          floqId,
          settings: newSettings,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["floq-settings", floqId] });
      toast.success('Settings saved successfully');
    },
    onError: (error: any) => {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettings.mutate,
    isSaving: updateSettings.isPending,
  };
}