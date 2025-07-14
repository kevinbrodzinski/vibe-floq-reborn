import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, MapPin, Users, UserMinus, Zap, X, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VibeRing } from '@/components/VibeRing';
import { FloqChat } from '@/components/floq/FloqChat';
import { FloqActivityFeed } from '@/components/floq/FloqActivityFeed';
import { IconPill } from '@/components/IconPill';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDeleteFloq } from '@/hooks/useDeleteFloq';
import { ManageFloqView } from './ManageFloqView';
import { InviteFriendsButton } from '@/components/floq/InviteFriendsButton';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@supabase/auth-helpers-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistance } from '@/utils/formatDistance';
import { cn } from '@/lib/utils';
import type { FloqDetails } from '@/hooks/useFloqDetails';
import { hasManagePermission } from '@/utils/permissions';
import { useCallback } from 'react';
import { useUnreadCounts, useFloqTabBadges } from '@/hooks/useUnreadCounts';
import { useActivityTracking } from '@/hooks/useActivityTracking';

interface JoinedFloqViewProps {
  floqDetails: FloqDetails;
  onLeave: () => void;
  isLeaving: boolean;
  liveScore?: { activity_score: number };
  onEndFloq?: () => void;
  isEndingFloq?: boolean;
}

export const JoinedFloqView: React.FC<JoinedFloqViewProps> = ({
  floqDetails,
  onLeave,
  isLeaving,
  liveScore,
  onEndFloq,
  isEndingFloq = false
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const session = useSession();
  const navigate = useNavigate();

  // URL-based tab state for main tabs
  const activeTab = searchParams.get('tab') || 'chat';

  const setActiveTab = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'chat') {
      newParams.delete('tab'); // Default tab doesn't need URL param
    } else {
      newParams.set('tab', tab);
    }
    setSearchParams(newParams);
  };
  const { mutateAsync: deleteFloq, isPending: isDeleting } = useDeleteFloq();

  // Bulletproof host detection
  const isHost = useMemo(() => 
    floqDetails?.creator_id === session?.user.id, 
    [floqDetails?.creator_id, session?.user.id]
  );

  // Check manage permissions (future-proofed for roles)
  const canManage = useMemo(() => 
    hasManagePermission(floqDetails?.creator_id, session?.user.id),
    [floqDetails?.creator_id, session?.user.id]
  );

  // Get unread counts for badge display
  const { data: unreadCounts } = useUnreadCounts(floqDetails.id);
  const tabBadges = useFloqTabBadges(floqDetails.id);
  const track = useActivityTracking(floqDetails.id);

  // Track activity when tab changes
  useEffect(() => {
    // Map activeTab to section names for tracking
    const sectionMap: Record<string, 'chat' | 'activity' | 'plans' | 'all'> = {
      chat: 'chat',
      activity: 'activity', 
      plans: 'plans',
      manage: 'all'
    };
    
    const section = sectionMap[activeTab];
    if (section) {
      track(section);
    }
  }, [activeTab, track]);

  // Plans CTA callback
  const goToNewPlan = useCallback(
    () => navigate(`/floqs/${floqDetails.id}/plans/new`),
    [floqDetails.id, navigate]
  );

  // Calculate if user is a member - use stable dependency tracking
  const isMember = useMemo(() => 
    floqDetails.participants?.some(p => p.user_id === session?.user.id) || false,
    [JSON.stringify(floqDetails.participants?.map(p => p.user_id)), session?.user.id]
  );

  // Check if floq can be deleted
  const canDelete = useMemo(() => 
    isHost && (
      floqDetails.participant_count === 1 || 
      (floqDetails.ends_at && new Date(floqDetails.ends_at) < new Date())
    ),
    [isHost, floqDetails.participant_count, floqDetails.ends_at]
  );

  const formatTimeFromNow = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((time.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 0) {
      return `Started ${Math.abs(diffInMinutes)}m ago`;
    } else if (diffInMinutes < 60) {
      return `Starts in ${diffInMinutes}m`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      return `Starts in ${hours}h ${diffInMinutes % 60}m`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Compact Hero Section */}
      <Card className="mx-4 pt-3 pb-4 px-6 bg-gradient-to-br from-card to-card/80">
        <div className="flex items-start gap-4">
          <VibeRing vibe={floqDetails.primary_vibe} className="w-12 h-12">
            <Avatar className="w-full h-full">
              <AvatarImage 
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${floqDetails.title}`} 
                alt={floqDetails.title}
              />
              <AvatarFallback className="text-sm font-semibold">
                {floqDetails.title.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </VibeRing>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold mb-1">{floqDetails.title}</h2>
            {floqDetails.description && (
              <p className="text-sm text-muted-foreground mb-1 line-clamp-1">{floqDetails.description}</p>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className="capitalize text-xs"
                style={{ borderColor: `hsl(var(--${floqDetails.primary_vibe}))` }}
              >
                {floqDetails.primary_vibe}
              </Badge>
              {(isHost || floqDetails.is_creator) && (
                <Badge variant="secondary" className="text-xs whitespace-nowrap">You're the host</Badge>
              )}
              {!floqDetails.ends_at && (
                <Badge className="bg-persistent text-persistent-foreground text-xs">
                  Ongoing
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{floqDetails.participant_count}</span>
              </div>
              
              {floqDetails.starts_at && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeFromNow(floqDetails.starts_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Leave Button (compact) */}
          {!(isHost || floqDetails.is_creator) && (
            <Button
              onClick={onLeave}
              disabled={isLeaving}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              {isLeaving ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserMinus className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* Pinned Note Banner */}
      <AnimatePresence mode="popLayout">
        {floqDetails.pinned_note && (
          <motion.div
            key="pinned-note"
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            className="mx-4 my-3 rounded-xl bg-muted/50 p-3 text-sm border-l-4 border-primary/50"
          >
            <div className="font-medium text-xs text-muted-foreground mb-1">📌 Pinned by host</div>
            {floqDetails.pinned_note}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabbed Interface */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn(
            "grid w-full",
            isHost ? "grid-cols-4" : "grid-cols-3"
          )}>
            <TabsTrigger value="chat" className="relative">
              Chat
              {unreadCounts?.unread_chat && unreadCounts.unread_chat > 0 && (
                <Badge className="ml-1 h-4 px-1 text-xs" key="chat-badge">
                  {unreadCounts.unread_chat}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="relative">
              Activity
              {unreadCounts?.unread_activity && unreadCounts.unread_activity > 0 && (
                <Badge className="ml-1 h-4 px-1 text-xs" key="activity-badge">
                  {unreadCounts.unread_activity}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="plans" className="relative">
              Plans
              {unreadCounts?.unread_plans && unreadCounts.unread_plans > 0 && (
                <Badge className="ml-1 h-4 px-1 text-xs" key="plans-badge">
                  {unreadCounts.unread_plans}
                </Badge>
              )}
            </TabsTrigger>
            {canManage && <TabsTrigger value="manage">Manage</TabsTrigger>}
          </TabsList>

          {/* Action Pills Row - Only show if member */}
          {(isMember || isHost || floqDetails.is_creator) && (
            <div className="flex gap-2 mt-4 mb-4">
              {/* End Floq for persistent hosts only */}
              {(isHost || floqDetails.is_creator) && !floqDetails.ends_at && onEndFloq && (
                <IconPill
                  icon={<X className="w-3 h-3" />}
                  label="End Floq"
                  onClick={onEndFloq}
                  disabled={isEndingFloq}
                  variant="destructive"
                  className="border-destructive"
                />
              )}
              
              {/* Boost available to all joined members */}
              <IconPill
                icon={<Zap className="w-3 h-3" />}
                label="Boost"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.rpc('boost_floq', { 
                      p_floq_id: floqDetails.id 
                    });
                    
                    if (error) throw error;
                    
                    if (import.meta.env.DEV) console.debug('Boost applied successfully');
                  } catch (error) {
                    console.error('Failed to boost floq:', error);
                  }
                }}
              />
              
              {/* Invite friends - with capacity and permission guards */}
              {(isMember || isHost || floqDetails.is_creator) && (
                <InviteFriendsButton
                  floqId={floqDetails.id}
                  variant="outline"
                  size="sm"
                  disabled={
                    (floqDetails.max_participants ?? 999) <= 
                    (floqDetails.participant_count + (floqDetails.pending_invites?.length || 0))
                  }
                />
              )}
            </div>
          )}

          <TabsContent value="chat" className="mt-0">
            <Card className="h-[400px] flex flex-col">
              <FloqChat 
                floqId={floqDetails.id}
                isOpen={true}
                onClose={() => {}}
                isJoined={isMember || isHost || floqDetails.is_creator}
              />
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <FloqActivityFeed floqId={floqDetails.id} />
          </TabsContent>

          <TabsContent value="plans" className="mt-0">
            <Card className="p-4">
              <div className="text-center py-8">
                <h3 className="font-semibold mb-2">Plans</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Coordinate activities and future meetups
                </p>
                {isHost ? (
                  <Button
                    onClick={goToNewPlan}
                    className="mt-6 self-center"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Create first plan
                  </Button>
                ) : (
                  <p className="text-muted-foreground">
                    No plans yet — ask the host!
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Manage Tab - Host Only */}
          {canManage && (
            <TabsContent value="manage" className="mt-0">
              <ManageFloqView 
                floqDetails={floqDetails}
                onEndFloq={onEndFloq}
                isEndingFloq={isEndingFloq}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete this floq?"
        description="This action is permanent. Other members will no longer see this floq."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={async () => {
          try {
            const result = await deleteFloq(floqDetails.id);
            setShowDeleteConfirm(false);
            
            // Analytics event after successful deletion
            if (import.meta.env.DEV) console.debug('floq_deleted', { 
              floq_id: floqDetails.id, 
              participant_count: floqDetails.participant_count 
            });
            
            navigate("/floqs");
          } catch (error) {
            // Error already handled in hook
          }
        }}
      />

      {/* Bottom padding for scroll clearance */}
      <div className="pb-8" />
    </div>
  );
};