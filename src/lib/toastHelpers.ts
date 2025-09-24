import { useToast } from '@/hooks/use-toast';
import { MESSAGE_TEXT, type MessageKey } from '@/constants/messages';

/**
 * Enhanced toast helpers with semantic message constants
 * Use these instead of raw toast calls for consistency
 */

export function useSemanticToast() {
  const { toast, dismiss } = useToast();

  const showSuccess = (messageKey: MessageKey, description?: string) => {
    toast({
      title: MESSAGE_TEXT[messageKey],
      description,
      variant: 'default',
    });
  };

  const showError = (messageKey: MessageKey, description?: string) => {
    toast({
      title: MESSAGE_TEXT[messageKey],
      description,
      variant: 'destructive',
    });
  };

  const showInfo = (messageKey: MessageKey, description?: string) => {
    toast({
      title: MESSAGE_TEXT[messageKey],
      description,
    });
  };

  const showWarning = (messageKey: MessageKey, description?: string) => {
    toast({
      title: MESSAGE_TEXT[messageKey],
      description,
    });
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    toast, // Still expose raw toast for custom cases
    dismiss, // Expose dismiss function
  };
}

/**
 * Hook for onboarding-specific toasts with cleanup
 */
export function useOnboardingToasts() {
  const { showSuccess, showError, toast, dismiss } = useSemanticToast();
  
  return {
    showOnboardingComplete: () => showSuccess('success_onboarding_complete'),
    showOnboardingSaveFailed: (description?: string) => 
      showError('error_onboarding_save_failed', description),
    showUserPreferencesFailed: (description?: string) => 
      showError('error_user_preferences_save_failed', description),
    showLogoutSuccess: () => showSuccess('success_logout_complete'),
    showLogoutFailed: (description?: string) => 
      showError('error_logout_failed', description),
    toast, // Expose raw toast for custom cases
    dismiss, // Expose dismiss function
  };
}