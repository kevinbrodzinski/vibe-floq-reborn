import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OnboardingCompletionStepProps {
  onDone: () => void;
}

export function OnboardingCompletionStep({ onDone }: OnboardingCompletionStepProps) {
  const session = useSession();
  const queryClient = useQueryClient();

  const handleFinish = async () => {
    if (!session?.user?.id) return;

    try {
      // Save onboarding completion to user preferences
      const { error } = await supabase.from('user_preferences').upsert({
        user_id: session.user.id,
        onboarding_version: 'v2',
        onboarding_completed_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error updating onboarding completion:', error);
        toast.error('Failed to complete onboarding. Please try again.');
        return;
      }

      // Invalidate user preferences to trigger re-fetch
      await queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      
      // Call onDone to exit onboarding flow
      onDone();
      
      toast.success('Welcome to Floq! 🎉');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await queryClient.clear();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
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
          <Button variant="ghost" onClick={handleLogout}>
            Log Out
          </Button>
          <Button onClick={handleFinish}>
            Enter Floq ✨
          </Button>
        </div>
      </div>
    </div>
  );
}