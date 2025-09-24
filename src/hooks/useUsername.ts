
import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { debounce } from 'lodash-es';

export function useUsername() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  // Get current user's profile to check if they have a username
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', user.id as any)
        .single()
        .returns<any>();

      return profile;
    },
  });

  // Check username availability
  const checkAvailability = useCallback(async (username: string) => {
    if (!username.trim() || username.length < 3) {
      setIsAvailable(null);
      return false;
    }

    // Validate format client-side first (allow capitals, backend will convert)
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
      setIsAvailable(false);
      return false;
    }

    setIsCheckingAvailability(true);
    try {
      const { data, error } = await supabase.rpc('username_available', { u: username });
      
      if (error) {
        console.error('Availability check error:', error);
        setIsAvailable(false);
        return false;
      }

      setIsAvailable(data as any);
      return data;
    } catch (error) {
      console.error('Availability check error:', error);
      setIsAvailable(false);
      return false;
    } finally {
      setIsCheckingAvailability(false);
    }
  }, []);

  // Debounced availability checker
  const debouncedCheck = useRef(
    debounce((username: string) => {
      checkAvailability(username);
    }, 400)
  ).current;

  // Update draft and trigger availability check
  const updateDraft = useCallback((username: string) => {
    setDraft(username);
    
    if (!username.trim() || username.length < 3) {
      setIsAvailable(null);
      return;
    }

    // Check availability with lowercase version since backend stores lowercase
    debouncedCheck(username.toLowerCase());
  }, [debouncedCheck]);

  // Update username mutation using our new RPC
  const updateMutation = useMutation({
    mutationFn: async (username: string) => {
      const { data, error } = await supabase.rpc('update_username', { 
        p_username: username 
      });

      if (error) {
        throw error;
      }

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Username update failed');
      }

      return result.username;
    },
    onSuccess: (newUsername) => {
      toast({
        title: "Username updated!",
        description: `@${newUsername} is now yours`,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      // Reset state
      setDraft('');
      setIsAvailable(null);
    },
    onError: (error: any) => {
      console.error('Username update error:', error);
      toast({
        title: "Failed to update username",
        description: error.message || "Please try a different username",
        variant: "destructive",
      });
    },
  });

  return {
    currentUser,
    draft,
    updateDraft,
    isAvailable,
    isCheckingAvailability,
    updateUsername: updateMutation.mutate,
    isUpdatingUsername: updateMutation.isPending,
    hasUsername: !!(currentUser as any)?.username,
  };
}
