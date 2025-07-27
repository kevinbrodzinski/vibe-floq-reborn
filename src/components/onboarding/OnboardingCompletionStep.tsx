
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

      // Update both tables atomically to ensure consistency
      const completionTime = new Date().toISOString();

      // 1. Create user profile
      console.log('📝 Creating user profile...');
      const profileData = {
        id: session.user.id,
        username: state.profileData.username.toLowerCase().trim(),
        display_name: state.profileData.display_name.trim(),
        bio: state.profileData.bio?.trim() || null,
        interests: state.profileData.interests || [],
        avatar_url: state.avatarUrl || null,
        vibe_preference: state.selectedVibe,
        profile_created: true,
        email: session.user.email || null,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        if (profileError.code === '23505' && profileError.message?.includes('username')) {
          throw new Error(`Username "${state.profileData.username}" is already taken. Please choose a different one.`);
        }
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      console.log('✅ Profile created successfully');

      // 2. Mark onboarding progress as completed
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
        console.error('Progress Error Details:', { 
          message: progressError.message, 
          details: progressError.details,
          hint: progressError.hint,
          code: progressError.code 
        });
        showOnboardingSaveFailed(progressError.details || progressError.message);
        throw new Error(`Failed to update onboarding progress: ${progressError.message}`);
      }

      // 2. Update user preferences
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
        console.error('Preferences Error Details:', { 
          message: preferencesError.message, 
          details: preferencesError.details,
          hint: preferencesError.hint,
          code: preferencesError.code 
        });
        showUserPreferencesFailed(preferencesError.details || preferencesError.message);
        throw new Error(`Failed to update user preferences: ${preferencesError.message}`);
      }

      console.log('✅ Onboarding completion successful');

      // 3. Clear local storage to prevent stale state
      try {
        await storage.removeItem('floq_onboarding_complete');
        await storage.removeItem('floq_onboarding_progress');
      } catch (storageError) {
        console.warn('Warning: Failed to clear local storage:', storageError);
      }

      // 4. Invalidate queries to refresh auth state
      await queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      await queryClient.invalidateQueries({ queryKey: ['onboarding-complete'] });
      await queryClient.invalidateQueries({ queryKey: ['onboarding-progress', session.user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profile:v2', session.user.id] });
      await queryClient.invalidateQueries({ queryKey: ['current-user-profile'] });

      // 5. Show success message
      showOnboardingComplete();

      // 6. Complete onboarding flow
      console.log('🚀 Calling onDone to complete onboarding');
      onDone();

    } catch (error) {
      console.error('💥 Error completing onboarding:', error);
      setIsCompleting(false);
      const toastId = toast({
        variant: 'destructive',
        title: 'Failed to complete onboarding',
        description: 'Please try again.',
      });
      if (toastId) toastIdsRef.current.push(toastId.id);
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
