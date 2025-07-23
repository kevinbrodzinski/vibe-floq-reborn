
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
      
      // Clear all auth-related storage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('supabase.auth.') || key.includes('sb-') || key.includes('floq_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('Failed to remove storage key:', key, e);
        }
      });

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
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      className={className}
    >
      <LogOut className="w-4 h-4 mr-2" />
      Log Out
    </Button>
  );
}
