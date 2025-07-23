
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState } from 'react';

interface OnboardingCompletionStepProps {
  onDone: () => void;
}

export function OnboardingCompletionStep({ onDone }: OnboardingCompletionStepProps) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [isCompleting, setIsCompleting] = useState(false);

  const handleFinish = async () => {
    if (!session?.user?.id) {
      console.error('No authenticated user found');
      toast.error('Authentication error. Please try logging in again.');
      return;
    }

    try {
      setIsCompleting(true);
      console.log('🎯 Starting onboarding completion for user:', session.user.id);

      // Update both tables atomically to ensure consistency
      const completionTime = new Date().toISOString();

      // 1. Mark onboarding progress as completed
      const { error: progressError } = await supabase
        .from('user_onboarding_progress')
        .upsert({
          user_id: session.user.id,
          onboarding_version: 'v2',
          current_step: 6,
          completed_steps: [0, 1, 2, 3, 4, 5],
          completed_at: completionTime
        }, {
          onConflict: 'user_id'
        });

      if (progressError) {
        console.error('❌ Error updating onboarding progress:', progressError);
        throw new Error('Failed to update onboarding progress');
      }

      // 2. Update user preferences
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: session.user.id,
          onboarding_version: 'v2',
          onboarding_completed_at: completionTime,
        }, {
          onConflict: 'user_id'
        });

      if (preferencesError) {
        console.error('❌ Error updating user preferences:', preferencesError);
        throw new Error('Failed to update user preferences');
      }

      console.log('✅ Onboarding completion successful');

      // 3. Clear local storage to prevent stale state
      try {
        localStorage.removeItem('floq_onboarding_complete');
        localStorage.removeItem('floq_onboarding_progress');
      } catch (storageError) {
        console.warn('Warning: Failed to clear local storage:', storageError);
      }

      // 4. Invalidate queries to refresh auth state
      await queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      await queryClient.invalidateQueries({ queryKey: ['onboarding-complete'] });

      // 5. Show success message
      toast.success('Welcome to Floq! 🎉');

      // 6. Complete onboarding flow
      console.log('🚀 Calling onDone to complete onboarding');
      onDone();

    } catch (error) {
      console.error('💥 Error completing onboarding:', error);
      setIsCompleting(false);
      toast.error('Failed to complete onboarding. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out from onboarding completion step');
      
      // Clear all auth-related storage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('supabase.auth.') || key.includes('sb-'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear query cache
      await queryClient.clear();
      
      toast.success('Logged out successfully');
      
      // Force page reload to ensure clean state
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
      // Force reload anyway to clear state
      window.location.href = '/';
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
