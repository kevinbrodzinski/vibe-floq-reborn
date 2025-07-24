// Semantic toast message constants
// Keep messages semantic (what happened) vs UI text (how it's displayed)
// This enables future i18n and consistent messaging

// Onboarding Messages
export const ERROR_ONBOARDING_SAVE_FAILED = 'error_onboarding_save_failed';
export const ERROR_USER_PREFERENCES_SAVE_FAILED = 'error_user_preferences_save_failed';
export const SUCCESS_ONBOARDING_COMPLETE = 'success_onboarding_complete';
export const SUCCESS_LOGOUT_COMPLETE = 'success_logout_complete';
export const ERROR_LOGOUT_FAILED = 'error_logout_failed';

// Floq Messages
export const SUCCESS_FLOQ_UPDATED = 'success_floq_updated';
export const ERROR_FLOQ_UPDATE_FAILED = 'error_floq_update_failed';
export const SUCCESS_FLOQ_JOINED = 'success_floq_joined';
export const INFO_FLOQ_ALREADY_BOOSTED = 'info_floq_already_boosted';
export const INFO_FLOQ_FULL = 'info_floq_full';
export const SUCCESS_OWNERSHIP_TRANSFERRED = 'success_ownership_transferred';
export const ERROR_OWNERSHIP_TRANSFER_FAILED = 'error_ownership_transfer_failed';
export const SUCCESS_FLOQ_ARCHIVED = 'success_floq_archived';
export const ERROR_FLOQ_ARCHIVE_FAILED = 'error_floq_archive_failed';

// General Error Messages
export const ERROR_NETWORK_FAILED = 'error_network_failed';
export const ERROR_UNKNOWN = 'error_unknown';
export const SUCCESS_OPERATION_COMPLETE = 'success_operation_complete';

// Message text mapping for display
export const MESSAGE_TEXT = {
  [ERROR_ONBOARDING_SAVE_FAILED]: 'Failed to save onboarding progress',
  [ERROR_USER_PREFERENCES_SAVE_FAILED]: 'Failed to save user preferences',
  [SUCCESS_ONBOARDING_COMPLETE]: 'Welcome to Floq! 🎉',
  [SUCCESS_LOGOUT_COMPLETE]: 'Logged out successfully',
  [ERROR_LOGOUT_FAILED]: 'Failed to log out',
  [SUCCESS_FLOQ_UPDATED]: 'Floq updated successfully',
  [ERROR_FLOQ_UPDATE_FAILED]: 'Failed to update floq',
  [SUCCESS_FLOQ_JOINED]: 'Joined floq!',
  [INFO_FLOQ_ALREADY_BOOSTED]: 'Already boosted this floq!',
  [INFO_FLOQ_FULL]: 'This floq is full',
  [SUCCESS_OWNERSHIP_TRANSFERRED]: 'Ownership transferred successfully',
  [ERROR_OWNERSHIP_TRANSFER_FAILED]: 'Failed to transfer ownership',
  [SUCCESS_FLOQ_ARCHIVED]: 'Floq archived successfully',
  [ERROR_FLOQ_ARCHIVE_FAILED]: 'Failed to archive floq',
  [ERROR_NETWORK_FAILED]: 'Network error occurred',
  [ERROR_UNKNOWN]: 'Something went wrong',
  [SUCCESS_OPERATION_COMPLETE]: 'Operation completed successfully',
} as const;

export type MessageKey = keyof typeof MESSAGE_TEXT;
