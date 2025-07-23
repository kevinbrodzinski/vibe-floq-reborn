
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { storage, navigation } from '@/lib/storage';

interface OnboardingLogoutButtonProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

export function OnboardingLogoutButton({ 
  className, 
  variant = 'ghost', 
  size = 'sm' 
}: OnboardingLogoutButtonProps) {
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out from onboarding');
      
      // Clear all auth-related storage using unified storage
      await storage.clearAuthStorage();

      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear query cache
      await queryClient.clear();
      
      toast.success('Logged out successfully');
      
      // Navigate to home using platform-safe navigation
      navigation.navigate('/');
      
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
      // Force navigate anyway to clear state
      navigation.navigate('/');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      className={className}
    >
      <LogOut className="w-4 h-4 mr-2" />
      <span className="sr-only sm:not-sr-only">Log Out</span>
    </Button>
  );
}
