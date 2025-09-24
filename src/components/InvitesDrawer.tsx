import React, { useState, useCallback } from 'react';
import { X, Users, Calendar } from 'lucide-react';
import { useUserInvitations } from '@/hooks/useUserInvitations';
import { InviteRow } from '@/components/InviteRow';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { motion, AnimatePresence } from 'framer-motion';

interface InvitesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvitesDrawer: React.FC<InvitesDrawerProps> = ({ isOpen, onClose }) => {
  const [groupMode, setGroupMode] = useState<'floq' | 'plan_type'>('floq');
  const { invitations, grouped, isLoading, respondToInvitation } = useUserInvitations(groupMode);

  const handleAccept = useCallback(async (inviteId: string, planId: string) => {
    await respondToInvitation(inviteId, planId, true);
  }, [respondToInvitation]);

  const handleDecline = useCallback(async (inviteId: string, planId: string) => {
    await respondToInvitation(inviteId, planId, false);
  }, [respondToInvitation]);

  const getGroupTitle = (groupKey: string, invites: any[]) => {
    if (groupMode === 'floq') {
      return invites[0]?.plan?.floq?.title || invites[0]?.plan?.floq?.name || 'Independent Plans';
    }
    return groupKey.charAt(0).toUpperCase() + groupKey.slice(1) + ' Plans';
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <DrawerTitle className="text-lg font-semibold">Plan Invites</DrawerTitle>
            {invitations.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {invitations.length}
              </Badge>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Grouping Toggle */}
          {invitations.length > 0 && (
            <div className="p-4 border-b">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={groupMode === 'floq' ? 'default' : 'outline'}
                  onClick={() => setGroupMode('floq')}
                  className="text-xs"
                >
                  <Users className="w-3 h-3 mr-1" />
                  By Floq
                </Button>
                <Button
                  size="sm"
                  variant={groupMode === 'plan_type' ? 'default' : 'outline'}
                  onClick={() => setGroupMode('plan_type')}
                  className="text-xs"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  By Type
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-4 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : invitations.length === 0 ? (
              <EmptyState
                title="No Invites"
                description="When friends invite you to plans, they'll show up here."
                animation="party-balloons"
                variant="modal"
              />
            ) : (
              <AnimatePresence mode="wait">
                {Array.from(grouped.entries()).map(([groupKey, invites]) => (
                  <motion.div 
                    key={groupKey} 
                    className="space-y-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {getGroupTitle(groupKey, invites)}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {invites.length}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3" aria-live="polite">
                      {invites.map((invite) => (
                        <InviteRow
                          key={invite.id}
                          invite={invite}
                          isLoading={isLoading}
                          onAccept={handleAccept}
                          onDecline={handleDecline}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};