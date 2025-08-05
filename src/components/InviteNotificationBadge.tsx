import React from 'react';
import { useUserInvitations } from '@/hooks/useUserInvitations';

interface InviteNotificationBadgeProps {
  className?: string;
  showPulse?: boolean;
}

export const InviteNotificationBadge: React.FC<InviteNotificationBadgeProps> = ({ 
  className = "absolute -top-1 -right-1",
  showPulse = true 
}) => {
  const { invitations } = useUserInvitations();
  const pendingCount = invitations.length;

  if (pendingCount === 0) return null;

  return (
    <span 
      className={`${className} bg-destructive text-destructive-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center font-medium shadow-sm ${showPulse ? 'animate-pulse' : ''}`}
      aria-label={`${pendingCount} pending invitation${pendingCount === 1 ? '' : 's'}`}
    >
      {pendingCount > 9 ? '9+' : pendingCount}
    </span>
  );
};