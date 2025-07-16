import React from 'react';
import { useUserInvitations } from '@/hooks/useUserInvitations';

export const InviteNotificationBadge: React.FC = () => {
  const { invitations } = useUserInvitations();
  const pendingCount = invitations.length;

  if (pendingCount === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center font-medium shadow-sm">
      {pendingCount > 9 ? '9+' : pendingCount}
    </span>
  );
};