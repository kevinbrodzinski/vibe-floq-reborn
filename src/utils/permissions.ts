// Utility functions for user permissions and roles

/**
 * Check if user has manage permissions for a floq
 * Currently only hosts can manage, but this helper future-proofs
 * for role expansion (moderators, admins, etc.)
 */
export const hasManagePermission = (
  creatorId: string | null | undefined,
  profileId: string | null | undefined,
  userRole?: string
): boolean => {
  if (!profileId || !creatorId) return false;
  
  // Host/creator always has manage permissions
  if (creatorId === profileId) return true;
  
  // Future: Add support for moderator/admin roles
  if (userRole === 'moderator' || userRole === 'admin') return true;
  
  return false;
};

/**
 * Check if user is the host/creator of a floq
 */
export const isFloqHost = (
  creatorId: string | null | undefined,
  profileId: string | null | undefined
): boolean => {
  return !!(creatorId && profileId && creatorId === profileId);
};