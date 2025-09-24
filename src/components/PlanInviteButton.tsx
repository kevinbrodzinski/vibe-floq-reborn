import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { InviteNotificationBadge } from '@/components/InviteNotificationBadge';
import { InvitesDrawer } from '@/components/InvitesDrawer';

interface PlanInviteButtonProps {
  className?: string;
}

export const PlanInviteButton: React.FC<PlanInviteButtonProps> = ({ className = "" }) => {
  const [showInvites, setShowInvites] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowInvites(true)}
        className={`relative p-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 hover:bg-card/80 transition-all duration-300 text-muted-foreground hover:text-foreground ${className}`}
        aria-label="View plan invitations"
      >
        <Bell className="w-5 h-5" />
        <InviteNotificationBadge showPulse />
      </button>

      <InvitesDrawer 
        isOpen={showInvites}
        onClose={() => setShowInvites(false)}
      />
    </>
  );
};