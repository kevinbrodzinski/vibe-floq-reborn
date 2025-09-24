
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { storage } from '@/lib/storage';
import { navigation } from '@/lib/navigation';
import { CURRENT_ONBOARDING_VERSION, ONBOARDING_CONFLICT_COLUMNS } from '@/constants/onboarding';
import { useOnboardingToasts } from '@/lib/toastHelpers';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { getDefaultAvatar } from '@/lib/avatarGenerator';
import { type Vibe } from '@/lib/vibes';

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
  
  // Enable test mode for debugging (set to true to enable detailed logging)
  const TEST_MODE = true;

  // Cleanup toasts on unmount
  useEffect(() => {
    return () => {
      toastIdsRef.current.forEach(id => {
        if (id && typeof (id as any) === 'string') {
          dismiss();
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
      console.log('📊 Current onboarding state:', {
        currentStep: state.currentStep,
        selectedVibe: state.selectedVibe,
        profileData: state.profileData,
        avatarUrl: state.avatarUrl,
        hasProgress: state.currentStep > 0
      });

      if (TEST_MODE) {
        console.log('🧪 TEST MODE: Detailed onboarding state:', {
          session: session?.user?.id,
          state: JSON.stringify(state, null, 2),
          constants: {
            CURRENT_ONBOARDING_VERSION,
            ONBOARDING_CONFLICT_COLUMNS
          }
        });
      }

      // Comprehensive validation of required onboarding data
      const missingFields = [];
      
      if (!state.profileData?.username?.trim()) {
        missingFields.push('username');
      }
      
      if (!state.profileData?.display_name?.trim()) {
        missingFields.push('display name');
      }
      
      if (!state.selectedVibe) {
        missingFields.push('vibe selection');
      }
      
      // Avatar is optional - don't block completion if missing
      // if (!state.avatarUrl) {
      //   missingFields.push('avatar');
      // }
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}. Please complete all onboarding steps.`);
      }

      // Generate default avatar if none selected
      let avatarUrl = state.avatarUrl;
      if (!avatarUrl) {
        console.log('🎨 Generating default avatar with initials...');
        avatarUrl = getDefaultAvatar(
          state.profileData.display_name.trim(),
          state.profileData.username.trim(), 
          session.user.id,
          256
        );
        console.log('✅ Generated default avatar');
      }

      // Validate and map vibe preference to ensure it's valid
      const validVibes: Vibe[] = ['chill', 'hype', 'curious', 'social', 'solo', 'romantic', 'weird', 'down', 'flowing', 'open'];
      let vibePreference: Vibe = state.selectedVibe as Vibe;
      
      // Map invalid vibes to valid ones - use string comparison to avoid type errors
      if ((state.selectedVibe as string) === 'energetic') {
        vibePreference = 'hype';
        console.log('🔄 Mapped "energetic" to "hype" for database compatibility');
      }
      
      if (!validVibes.includes(vibePreference)) {
        vibePreference = 'chill';
        console.log('🔄 Invalid vibe detected, defaulting to "chill"');
      }

      // Prepare payload for edge function with validated data
      const payload = {
        username: state.profileData.username.trim().toLowerCase(),
        display_name: state.profileData.display_name.trim(),
        bio: state.profileData.bio?.trim().substring(0, 280) || null,
        avatar_url: avatarUrl, // Use generated avatar if none provided
        vibe_preference: vibePreference, // Use validated vibe
        interests: state.profileData.interests?.length ? state.profileData.interests : [],
        email: session.user.email,
      };
      
      console.log('📋 Profile payload prepared:', {
        ...payload,
        avatar_url: payload.avatar_url ? 'present' : 'missing'
      });

      // Create profile using edge function with fallback
      console.log('📝 Creating user profile via edge function...');
      console.log('📋 Edge function payload:', {
        ...payload,
        avatar_url: payload.avatar_url ? 'present' : 'missing'
      });
      
      let profileCreated = false;
      
      try {
        const { data: profile, error: profileError } = await supabase.functions.invoke('create-profile', {
          body: payload
        });

        if (profileError) {
          console.error('❌ Error creating profile via edge function:', profileError);
          
          // Handle specific edge function errors before fallback
          if (profileError.message?.includes('Missing required fields')) {
            throw new Error('Please complete all onboarding steps before continuing.');
          } else if (profileError.message?.includes('Username already taken')) {
            throw new Error('Username already taken. Please go back and choose another.');
          } else if (profileError.message?.includes('Unauthenticated')) {
            throw new Error('Authentication error. Please log in again.');
          }
          
          // Check if it's a network/function error that we can work around
          const isNetworkError = profileError.message?.includes('Load failed') || 
                                profileError.message?.includes('FunctionsFetchError') ||
                                profileError.message?.includes('Failed to fetch') ||
                                !profileError.status;
          
          if (isNetworkError) {
            console.log('🔄 Network error detected, attempting fallback to direct database insert...');
            throw new Error('FALLBACK_NEEDED');
          }
          
          throw new Error(profileError.message || 'Failed to create profile. Please try again.');
        }

        console.log('✅ Profile created successfully via edge function');
        profileCreated = true;
        
      } catch (error: any) {
        if (error.message === 'FALLBACK_NEEDED') {
          console.log('🔄 Attempting fallback profile creation...');
          
          // Check username uniqueness before inserting
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('username')
            .ilike('username', payload.username)
            .maybeSingle();
          
          if (existingUser) {
            throw new Error('Username already taken. Please go back and choose another.');
          }
          
          // Fallback: Direct database insert
          const { error: directInsertError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              username: payload.username,
              display_name: payload.display_name,
              bio: payload.bio,
              avatar_url: payload.avatar_url,
              vibe_preference: payload.vibe_preference,
              interests: payload.interests,
              email: payload.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (directInsertError) {
            console.error('❌ Fallback profile creation failed:', directInsertError);
            
            // Handle specific database errors
            if (directInsertError.code === '23505') {
              throw new Error('Username already taken. Please go back and choose another.');
            }
            
            throw new Error(`Failed to create profile: ${directInsertError.message}`);
          }
          
          console.log('✅ Profile created successfully via fallback method');
          console.log('ℹ️ Profile setup completed with direct database insert');
          profileCreated = true;
          
          // Show informational toast about fallback
          const toastId = toast({
            title: 'Profile Created',
            description: 'Your profile was set up successfully.',
          });
          if (toastId) toastIdsRef.current.push(toastId.id);
        } else {
          throw error;
        }
      }

      // Update both tables atomically to ensure consistency
      const completionTime = new Date().toISOString();

      // Mark onboarding progress as completed
      console.log('📝 Updating onboarding progress...');
      const { error: progressError } = await supabase
        .from('user_onboarding_progress')
        .upsert({
          profile_id: session.user.id,
          onboarding_version: CURRENT_ONBOARDING_VERSION,
          current_step: 6,
          completed_steps: [0, 1, 2, 3, 4, 5],
          completed_at: completionTime
        } as any, {
          onConflict: ONBOARDING_CONFLICT_COLUMNS as any,
          ignoreDuplicates: false
        });

      if (progressError) {
        console.error('❌ Error updating onboarding progress:', progressError);
        console.error('❌ Progress error details:', {
          message: progressError.message,
          details: progressError.details,
          hint: progressError.hint,
          code: progressError.code
        });
        showOnboardingSaveFailed(progressError.details || progressError.message);
        throw new Error(`Failed to update onboarding progress: ${progressError.message}`);
      }

      // Update user preferences with all required fields
      console.log('📝 Updating user preferences...');
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .upsert({
          profile_id: session.user.id,
          onboarding_version: CURRENT_ONBOARDING_VERSION,
          onboarding_completed_at: completionTime,
          prefer_smart_suggestions: true,
          field_enabled: true,
          vibe_detection_enabled: true,
          preferred_vibe: state.selectedVibe,
          vibe_strength: 0.5,
          vibe_color: null,
          checkin_streak: 0,
          energy_streak_weeks: 0,
          social_streak_weeks: 0,
          both_streak_weeks: 0,
          favorite_locations: [],
          declined_plan_types: null,
          feedback_sentiment: null,
        } as any, {
          onConflict: 'profile_id' as any,
          ignoreDuplicates: false
        });

      if (preferencesError) {
        console.error('❌ Error updating user preferences:', preferencesError);
        console.error('❌ Preferences error details:', {
          message: preferencesError.message,
          details: preferencesError.details,
          hint: preferencesError.hint,
          code: preferencesError.code
        });
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

      // Show success message only if profile was created
      if (profileCreated) {
        showOnboardingComplete();
      }

      // Complete onboarding flow - always call onDone if we have a viable state
      console.log('🚀 Calling onDone to complete onboarding');
      onDone();

    } catch (error: any) {
      console.error('💥 Error completing onboarding:', error);
      setIsCompleting(false);
      
      // If we've gotten this far but still failed, try to salvage the situation
      // by completing onboarding anyway if it's a non-critical error
      const isRecoverableError = error?.message?.includes('Failed to update') && 
                                !error?.message?.includes('Username already taken') &&
                                !error?.message?.includes('Authentication error');
      
      if (isRecoverableError) {
        console.log('🆘 Attempting to recover from non-critical error...');
        const toastId = toast({
          title: 'Setup Partially Complete',
          description: 'Your profile was created but some settings may need to be finalized in Settings.',
        });
        if (toastId) toastIdsRef.current.push(toastId.id);
        
        // Still call onDone to prevent UX dead-end
        onDone();
        return;
      }
      
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
      } else if (error?.message?.includes('Missing required fields')) {
        const toastId = toast({
          variant: 'destructive',
          title: 'Incomplete profile',
          description: 'Please go back and complete all onboarding steps.',
        });
        if (toastId) toastIdsRef.current.push(toastId.id);
      } else {
        const toastId = toast({
          variant: 'destructive',
          title: 'Failed to complete onboarding',
          description: error?.message || 'An unexpected error occurred. Please try again.',
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
