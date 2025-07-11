
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
        .select('*')
        .eq('id', user.id)
        .single();

      return profile;
    },
  });

  // Check username availability
  const checkAvailability = useCallback(async (username: string) => {
    if (!username.trim() || username.length < 3) {
      setIsAvailable(null);
      return false;
    }

    // Validate format client-side first (lowercase only)
    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
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

      setIsAvailable(data);
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

    // Check availability directly since we only allow lowercase now
    debouncedCheck(username);
  }, [debouncedCheck]);

  // Claim username mutation
  const claimMutation = useMutation({
    mutationFn: async (username: string) => {
      const { data, error } = await supabase.rpc('attempt_claim_username', { 
        desired: username 
      });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Username is not available or invalid format');
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Username claimed!",
        description: `@${draft} is now yours`,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      // Reset state
      setDraft('');
      setIsAvailable(null);
    },
    onError: (error: any) => {
      console.error('Username claim error:', error);
      toast({
        title: "Failed to claim username",
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
    claimUsername: claimMutation.mutate,
    isClaimingUsername: claimMutation.isPending,
    hasUsername: !!(currentUser as any)?.username,
  };
}
