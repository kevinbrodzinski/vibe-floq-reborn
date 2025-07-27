
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { storage } from '@/lib/storage';
import { navigation } from '@/lib/navigation';
import { CURRENT_ONBOARDING_VERSION, ONBOARDING_CONFLICT_COLUMNS } from '@/constants';
import { useOnboardingToasts } from '@/lib/toastHelpers';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';

interface OnboardingCompletionStepProps {
  onDone: () => void;
}

export function OnboardingCompletionStep({ onDone }: OnboardingCompletionStepProps) {
  const session = useSession();
  const queryClient = useQueryClient();
  const { state } = useOnboardingProgress();
  const { 
    showOnboardingComplete, 
    showOnboardingSaveFailed, 
    showUserPreferencesFailed, 
    showLogoutSuccess, 
    showLogoutFailed,
    toast,
    dismiss
  } = useOnboardingToasts();
  const [isCompleting, setIsCompleting] = useState(false);
  const toastIdsRef = useRef<string[]>([]);

  // Cleanup toasts on unmount
  useEffect(() => {
    return () => {
      toastIdsRef.current.forEach(id => {
        if (id && typeof (id as any) === 'string') {
          dismiss(id as string);
        }
      });
    };
  }, [dismiss]);

  const handleFinish = async () => {
    if (!session?.user?.id) {
      console.error('No authenticated user found');
      const toastId = toast({
        variant: 'destructive',
        title: 'Authentication error',
        description: 'Please try logging in again.',
      });
      if (toastId) toastIdsRef.current.push(toastId.id);
      return;
    }

    if (isCompleting) return;

    try {
      setIsCompleting(true);
      console.log('🎯 Starting onboarding completion for user:', session.user.id);

      // Validate required onboarding data
      if (!state.profileData?.username || !state.profileData?.display_name) {
        throw new Error('Missing required profile data (username or display name)');
      }

      if (!state.selectedVibe) {
        throw new Error('Missing vibe selection');
      }

      // Prepare payload for edge function
      const payload = {
        username: state.profileData.username.trim().toLowerCase(),
        display_name: state.profileData.display_name.trim(),
        bio: state.profileData.bio?.trim().substring(0, 280) || null,
        avatar_url: state.avatarUrl || '',
        vibe_preference: state.selectedVibe,
        interests: state.profileData.interests?.length ? state.profileData.interests : [],
        email: session.user.email,
      };

      // Create profile using edge function
      console.log('📝 Creating user profile via edge function...');
      const { data: profile, error: profileError } = await supabase.functions.invoke('create-profile', {
        body: payload
      });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        throw profileError;
      }

      console.log('✅ Profile created successfully');

      // Update both tables atomically to ensure consistency
      const completionTime = new Date().toISOString();

      // Mark onboarding progress as completed
      const { error: progressError } = await supabase
        .from('user_onboarding_progress')
        .upsert({
          user_id: session.user.id,
          onboarding_version: CURRENT_ONBOARDING_VERSION,
          current_step: 6,
          completed_steps: [0, 1, 2, 3, 4, 5],
          completed_at: completionTime
        }, {
          onConflict: ONBOARDING_CONFLICT_COLUMNS,
          ignoreDuplicates: false
        });

      if (progressError) {
        console.error('❌ Error updating onboarding progress:', progressError);
        showOnboardingSaveFailed(progressError.details || progressError.message);
        throw new Error(`Failed to update onboarding progress: ${progressError.message}`);
      }

      // Update user preferences
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: session.user.id,
          onboarding_version: CURRENT_ONBOARDING_VERSION,
          onboarding_completed_at: completionTime,
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (preferencesError) {
        console.error('❌ Error updating user preferences:', preferencesError);
        showUserPreferencesFailed(preferencesError.details || preferencesError.message);
        throw new Error(`Failed to update user preferences: ${preferencesError.message}`);
      }

      console.log('✅ Onboarding completion successful');

      // Clear local storage to prevent stale state
      try {
        await storage.removeItem('floq_onboarding_complete');
        await storage.removeItem('floq_onboarding_progress');
      } catch (storageError) {
        console.warn('Warning: Failed to clear local storage:', storageError);
      }

      // Invalidate queries to refresh auth state
      await queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      await queryClient.invalidateQueries({ queryKey: ['onboarding-complete'] });
      await queryClient.invalidateQueries({ queryKey: ['onboarding-progress', session.user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profile:v2', session.user.id] });
      await queryClient.invalidateQueries({ queryKey: ['current-user-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });

      // Show success message
      showOnboardingComplete();

      // Complete onboarding flow
      console.log('🚀 Calling onDone to complete onboarding');
      onDone();

    } catch (error: any) {
      console.error('💥 Error completing onboarding:', error);
      setIsCompleting(false);
      
      // Handle specific error codes
      if (error?.message?.includes('Username already taken') || 
          error?.message?.includes('already taken') ||
          error?.status === 409 || 
          error?.code === '23505') {
        const toastId = toast({
          variant: 'destructive',
          title: 'Username taken',
          description: 'This username is already in use. Please go back and choose another.',
        });
        if (toastId) toastIdsRef.current.push(toastId.id);
      } else if (error?.status === 401) {
        const toastId = toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'Please log in again to continue.',
        });
        if (toastId) toastIdsRef.current.push(toastId.id);
      } else {
        const toastId = toast({
          variant: 'destructive',
          title: 'Failed to complete onboarding',
          description: error?.message || 'Please try again.',
        });
        if (toastId) toastIdsRef.current.push(toastId.id);
      }
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out from onboarding completion step');
      
      // Clear all auth-related storage using unified storage
      await storage.clearAuthStorage();

      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear query cache
      await queryClient.clear();
      
      showLogoutSuccess();
      
      // Navigate to home using platform-safe navigation
      navigation.navigate('/');
      
    } catch (error) {
      console.error('Error logging out:', error);
      showLogoutFailed();
      // Force navigate anyway to clear state
      navigation.navigate('/');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 bg-background min-h-screen">
      <div className="text-center">
        <h1 className="text-white text-2xl font-bold mb-4">Welcome to Floq! 🎉</h1>
        <p className="text-white/70 text-center mb-6">
          You're all set up and ready to explore.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            disabled={isCompleting}
          >
            Log Out
          </Button>
          <Button 
            onClick={handleFinish}
            disabled={isCompleting}
          >
            {isCompleting ? 'Setting up...' : 'Enter Floq ✨'}
          </Button>
        </div>
      </div>
    </div>
  );
}
