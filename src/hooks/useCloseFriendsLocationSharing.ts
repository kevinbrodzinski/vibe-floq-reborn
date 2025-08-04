import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { 
  CloseFriendsLocationSettings,
  CloseFriendsLocationPreferences,
  EnableCloseFriendsLocationSharingResponse,
  DisableCloseFriendsLocationSharingResponse
} from '@/types/closeFriendsLocation';
import { toast } from 'sonner';

// Hook to get close friends location sharing status
export const useCloseFriendsLocationSettings = () => {
  const currentUserId = useCurrentUserId();

  return useQuery({
    queryKey: ['close-friends-location-settings', currentUserId],
    queryFn: async (): Promise<CloseFriendsLocationSettings> => {
      if (!currentUserId) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .rpc('get_close_friends_location_status');

      if (error) {
        console.error('Error fetching close friends location settings:', error);
        throw error;
      }

      return data as CloseFriendsLocationSettings;
    },
    enabled: !!currentUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook to enable location sharing with all close friends
export const useEnableCloseFriendsLocationSharing = () => {
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();

  return useMutation({
    mutationFn: async ({
      accuracyLevel = 'approximate',
      autoWhen = ['always']
    }: {
      accuracyLevel?: 'exact' | 'approximate' | 'city';
      autoWhen?: string[];
    }): Promise<EnableCloseFriendsLocationSharingResponse> => {
      const { data, error } = await supabase
        .rpc('enable_close_friends_location_sharing', {
          accuracy_level: accuracyLevel,
          auto_when: autoWhen
        });

      if (error) {
        console.error('Error enabling close friends location sharing:', error);
        throw error;
      }

      return data as EnableCloseFriendsLocationSharingResponse;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['close-friends-location-settings'] });
      queryClient.invalidateQueries({ queryKey: ['live-share-friends'] });
      queryClient.invalidateQueries({ queryKey: ['live-settings'] });
      
      // Show success toast
      toast.success(
        `Location sharing enabled for ${data.close_friends_added} close friends`,
        {
          description: `Using ${data.accuracy_level} accuracy`
        }
      );
    },
    onError: (error) => {
      console.error('Enable close friends location sharing error:', error);
      toast.error('Failed to enable location sharing with close friends');
    },
  });
};

// Hook to disable location sharing with all close friends
export const useDisableCloseFriendsLocationSharing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<DisableCloseFriendsLocationSharingResponse> => {
      const { data, error } = await supabase
        .rpc('disable_close_friends_location_sharing');

      if (error) {
        console.error('Error disabling close friends location sharing:', error);
        throw error;
      }

      return data as DisableCloseFriendsLocationSharingResponse;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['close-friends-location-settings'] });
      queryClient.invalidateQueries({ queryKey: ['live-share-friends'] });
      
      // Show success toast
      toast.success(
        `Location sharing disabled for ${data.close_friends_removed} close friends`
      );
    },
    onError: (error) => {
      console.error('Disable close friends location sharing error:', error);
      toast.error('Failed to disable location sharing with close friends');
    },
  });
};

// Hook to update close friends location preferences
export const useUpdateCloseFriendsLocationPreferences = () => {
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();

  return useMutation({
    mutationFn: async (
      preferences: Partial<CloseFriendsLocationPreferences>
    ): Promise<void> => {
      if (!currentUserId) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .update(preferences)
        .eq('id', currentUserId);

      if (error) {
        console.error('Error updating close friends location preferences:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['close-friends-location-settings'] });
      
      // Show success toast
      toast.success('Location sharing preferences updated');
    },
    onError: (error) => {
      console.error('Update close friends location preferences error:', error);
      toast.error('Failed to update location sharing preferences');
    },
  });
};

// Hook for toggling close friends location sharing
export const useToggleCloseFriendsLocationSharing = () => {
  const { data: settings } = useCloseFriendsLocationSettings();
  const enableMutation = useEnableCloseFriendsLocationSharing();
  const disableMutation = useDisableCloseFriendsLocationSharing();

  const toggle = async (
    enabled: boolean,
    options?: {
      accuracyLevel?: 'exact' | 'approximate' | 'city';
      autoWhen?: string[];
    }
  ) => {
    if (enabled) {
      return enableMutation.mutateAsync({
        accuracyLevel: options?.accuracyLevel,
        autoWhen: options?.autoWhen
      });
    } else {
      return disableMutation.mutateAsync();
    }
  };

  return {
    toggle,
    isLoading: enableMutation.isPending || disableMutation.isPending,
    error: enableMutation.error || disableMutation.error,
    isEnabled: settings?.enabled || false,
    settings
  };
};

// Hook to check if location sharing with close friends is available
export const useCloseFriendsLocationAvailability = () => {
  const { data: settings, isLoading } = useCloseFriendsLocationSettings();
  
  const isAvailable = !isLoading && settings && settings.close_friends_count > 0;
  const canEnable = isAvailable && !settings.enabled;
  const canDisable = isAvailable && settings.enabled;
  
  return {
    isAvailable,
    canEnable,
    canDisable,
    closeFriendsCount: settings?.close_friends_count || 0,
    isLoading
  };
};

// Hook to get location sharing summary for display
export const useCloseFriendsLocationSummary = () => {
  const { data: settings, isLoading, error } = useCloseFriendsLocationSettings();
  
  const summary = {
    enabled: settings?.enabled || false,
    statusText: settings ? formatLocationSharingStatus(settings) : '',
    accuracyLevel: settings?.accuracy_level || 'approximate',
    autoShareWhen: settings?.auto_share_when || ['always'],
    closeFriendsCount: settings?.close_friends_count || 0,
    sharingWithCount: settings?.sharing_with_count || 0,
    allSharingEnabled: settings?.all_close_friends_sharing || false
  };
  
  return {
    summary,
    isLoading,
    error
  };
};

// Helper function to format status (moved from types file for hook usage)
const formatLocationSharingStatus = (settings: CloseFriendsLocationSettings): string => {
  if (!settings.enabled) {
    return 'Location sharing with close friends is disabled';
  }
  
  if (settings.close_friends_count === 0) {
    return 'No close friends to share location with';
  }
  
  if (settings.all_close_friends_sharing) {
    const accuracyLabel = settings.accuracy_level === 'exact' ? 'exact' : 
                         settings.accuracy_level === 'city' ? 'city-level' : 'approximate';
    return `Sharing ${accuracyLabel} location with all ${settings.close_friends_count} close friends`;
  }
  
  return `Sharing location with ${settings.sharing_with_count} of ${settings.close_friends_count} close friends`;
};