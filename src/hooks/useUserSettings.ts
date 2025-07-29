import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export interface UserSettings {
  profile_id: string;
  notification_preferences: {
    push: boolean;
    email: boolean;
    new_friend: boolean;
    dm: boolean;
    nearby_friend: boolean;
    afterglow_recap: boolean;
  };
  privacy_settings: {
    location_sharing: boolean;
    profile_visibility: 'public' | 'friends' | 'private';
    broadcast_radius: number;
    battery_save_mode: boolean;
    always_immersive_venues: boolean;
  };
  theme_preferences: {
    dark_mode: boolean;
    accent_color: string;
  };
  preferred_welcome_template?: 'casual-hangout' | 'professional-meetup' | 'event-based' | 'study-group' | 'creative-collab' | 'support-group';
  available_until?: string | null;
  field_enabled: boolean;
  field_ripples?: boolean;
  field_trails?: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_NOTIFICATION_PREFERENCES = {
  push: true,
  email: false,
  new_friend: true,
  dm: true,
  nearby_friend: true,
  afterglow_recap: true,
};

const DEFAULT_PRIVACY_SETTINGS = {
  location_sharing: true,
  profile_visibility: 'public' as const,
  broadcast_radius: 500,
  battery_save_mode: false,
  always_immersive_venues: true, // Default to enhanced venue experience
};

const DEFAULT_THEME_PREFERENCES = {
  dark_mode: true,
  accent_color: 'purple',
};

const DEFAULT_SETTINGS: Partial<UserSettings> = {
  notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  privacy_settings: DEFAULT_PRIVACY_SETTINGS,
  theme_preferences: DEFAULT_THEME_PREFERENCES,
  field_enabled: false,
};

export const useUserSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['user-settings', user?.id],
    enabled: !!user?.id,
    retry: 1,
    staleTime: 60000, // 1 minute
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('User settings error:', error);
        throw error;
      }
      
      // Return merged settings with defaults
      if (data) {
        const notificationPrefs = (data.notification_preferences as Record<string, any>) || {};
        const privacySettings = (data.privacy_settings as Record<string, any>) || {};
        const themePrefs = (data.theme_preferences as Record<string, any>) || {};
        
        return {
          ...data,
          notification_preferences: { 
            ...DEFAULT_NOTIFICATION_PREFERENCES, 
            ...notificationPrefs
          },
          privacy_settings: { 
            ...DEFAULT_PRIVACY_SETTINGS, 
            ...privacySettings
          },
          theme_preferences: { 
            ...DEFAULT_THEME_PREFERENCES, 
            ...themePrefs
          },
          field_enabled: data.field_enabled ?? false,
        } as UserSettings;
      }
      return {
        profile_id: user.id,
        notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES,
        privacy_settings: DEFAULT_PRIVACY_SETTINGS,
        theme_preferences: DEFAULT_THEME_PREFERENCES,
        field_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as UserSettings;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          profile_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] });
    },
    onError: (error) => {
      console.error('Failed to update user settings:', error);
      toast({
        title: "Update failed",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateNotificationPreference = (key: keyof UserSettings['notification_preferences'], value: boolean) => {
    if (!settings || !settings.notification_preferences) return;
    
    updateSettingsMutation.mutate({
      notification_preferences: {
        ...settings.notification_preferences,
        [key]: value,
      },
    });
  };

  const updatePrivacySetting = (key: keyof UserSettings['privacy_settings'], value: any) => {
    if (!settings || !settings.privacy_settings) return;
    
    updateSettingsMutation.mutate({
      privacy_settings: {
        ...settings.privacy_settings,
        [key]: value,
      },
    });
  };

  const updateBroadcastRadius = async (radius: number) => {
    if (!user?.id || !settings) return;
    
    try {
      if (!settings.privacy_settings) return;
      
      // Update user settings
      updateSettingsMutation.mutate({
        privacy_settings: {
          ...settings.privacy_settings,
          broadcast_radius: radius,
        },
      });

      // Update current presence with new broadcast radius
      const { error } = await supabase
        .from('vibes_now')
        .update({ broadcast_radius: radius })
        .eq('profile_id', user.id);

      if (error) throw error;
      
      toast({
        title: "Broadcast radius updated",
        description: `Your presence radius is now ${radius}m`,
      });
    } catch (error) {
      console.error('Failed to update broadcast radius:', error);
      toast({
        title: "Update failed",
        description: "Failed to update broadcast radius. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateWelcomeTemplate = async (template: UserSettings['preferred_welcome_template']) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase.functions.invoke('update-settings', {
        body: { 
          target: 'user',
          updates: { preferred_welcome_template: template }
        },
      });

      if (error) throw error;
      
      // Invalidate cache to refetch updated settings
      queryClient.invalidateQueries({ queryKey: ['user-settings', user.id] });
      
      toast({
        title: "Welcome template updated",
        description: "Your preferred welcome message template has been saved.",
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to update welcome template:', error);
      toast({
        title: "Update failed",
        description: "Failed to update welcome template. Please try again.",
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  };

  const updateFieldEnabled = (enabled: boolean) => {
    if (!settings) return;
    
    updateSettingsMutation.mutate({
      field_enabled: enabled,
    });
  };

  return {
    settings: settings as UserSettings | undefined,
    isLoading,
    error,
    updateNotificationPreference,
    updatePrivacySetting,
    updateBroadcastRadius,
    updateWelcomeTemplate,
    updateFieldEnabled,
    isUpdating: updateSettingsMutation.isPending,
  };
};