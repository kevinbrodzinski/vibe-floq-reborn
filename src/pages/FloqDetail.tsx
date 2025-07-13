import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Users, Clock, MapPin, MessageCircle, UserPlus, UserMinus, Zap, UserPlus2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { VibeRing } from '@/components/VibeRing';
import { FloqChat } from '@/components/floq/FloqChat';
import { InviteFriendsButton } from '@/components/floq/InviteFriendsButton';
import { useFloqDetails } from '@/hooks/useFloqDetails';
import { useLiveFloqScore } from '@/hooks/useLiveFloqScore';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useNavigation } from '@/hooks/useNavigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useRateLimiter } from '@/hooks/useRateLimiter';
import { useFloqUI } from '@/contexts/FloqUIContext';
import { useEndFloq } from '@/hooks/useEndFloq';
import { formatDistance } from '@/utils/formatDistance';
import { cn } from '@/lib/utils';
import { EndFloqConfirmDialog } from '@/components/EndFloqConfirmDialog';
import { IconPill } from '@/components/IconPill';

const FloqDetail = () => {
  const { floqId } = useParams<{ floqId: string }>();
  const { goBack } = useNavigation();
  const { successFeedback, errorFeedback } = useHapticFeedback();
  const { showChat, setShowChat } = useFloqUI();
  const { mutateAsync: endFloq, isPending: isEndingFloq } = useEndFloq();
  const [showEndConfirm, setShowEndConfirm] = React.useState(false);
  const [showInvite, setShowInvite] = React.useState(false);
  
  const { data: floqDetails, isLoading, error, refetch } = useFloqDetails(floqId);
  const { data: liveScore, error: scoreError } = useLiveFloqScore(floqId);
  const { joinFloq, leaveFloq } = useOfflineQueue();
  
  // Rate limiting for join/leave actions
  const { attempt: attemptJoinLeave } = useRateLimiter({
    maxAttempts: 3,
    windowMs: 30000, // 30 seconds
    message: "Please wait before trying to join/leave again",
  });

  const handleJoinToggle = async () => {
    if (!floqDetails || !attemptJoinLeave()) return;
    
    try {
      if (floqDetails.is_joined) {
        await leaveFloq.mutateAsync(floqDetails.id);
        successFeedback();
      } else {
        await joinFloq.mutateAsync(floqDetails.id);
        successFeedback();
      }
    } catch (error) {
      console.error('Failed to toggle floq membership:', error);
      errorFeedback();
    }
  };

  // Auto-refresh on errors to recover from transient issues
  useEffect(() => {
    if (error || scoreError) {
      const timer = setTimeout(() => {
        refetch();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, scoreError, refetch]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-24 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !floqDetails) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Floq Not Found</h1>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              This floq doesn't exist or you don't have permission to view it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur flex items-center gap-2 px-4 py-3 border-b">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </header>

      {/* Scrollable Body */}
      <ScrollArea className="flex-1 overscroll-contain max-h-[calc(100dvh-8rem)]">
        <div className="max-w-md mx-auto px-4 py-6 pb-[env(safe-area-inset-bottom)] space-y-6">
          {/* Hero Section */}
          <Card className="mx-4 p-6 bg-gradient-to-br from-card to-card/80">
            <div className="flex items-start gap-4">
              <VibeRing vibe={floqDetails.primary_vibe} className="w-16 h-16">
                <Avatar className="w-full h-full">
                  <AvatarImage 
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${floqDetails.title}`} 
                    alt={floqDetails.title}
                  />
                  <AvatarFallback className="text-lg font-semibold">
                    {floqDetails.title.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </VibeRing>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold mb-2">{floqDetails.title}</h2>
                {floqDetails.name && (
                  <p className="text-sm text-muted-foreground mb-2">{floqDetails.name}</p>
                )}
                
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant="outline" 
                    className="capitalize"
                    style={{ borderColor: `hsl(var(--${floqDetails.primary_vibe}))` }}
                  >
                    {floqDetails.primary_vibe}
                  </Badge>
                  {floqDetails.is_creator && (
                    <Badge variant="secondary" className="text-xs">Host</Badge>
                  )}
                  {!floqDetails.ends_at && (
                    <Badge className="bg-persistent text-persistent-foreground text-xs">
                      Ongoing
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{floqDetails.participant_count} members</span>
                    {floqDetails.max_participants && (
                      <span>/ {floqDetails.max_participants}</span>
                    )}
                  </div>
                  
                  {floqDetails.starts_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeFromNow(floqDetails.starts_at)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {floqDetails.location.lat.toFixed(4)}, {floqDetails.location.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Score with smooth animations */}
            {(liveScore?.activity_score !== undefined || floqDetails.activity_score !== undefined) && (
              <div className="mt-4 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Activity</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary-foreground transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${Math.min(100, (liveScore?.activity_score || floqDetails.activity_score || 0))}%`,
                          transform: liveScore?.activity_score !== floqDetails.activity_score ? 'scaleX(1.1)' : 'scaleX(1)',
                        }}
                      />
                    </div>
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      liveScore?.activity_score !== floqDetails.activity_score && "text-primary"
                    )}>
                      {Math.round(liveScore?.activity_score || floqDetails.activity_score || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Participants */}
          {floqDetails.participants.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Members</h3>
                <Badge variant="secondary">{floqDetails.participants.length}</Badge>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                {floqDetails.participants.slice(0, 8).map((participant) => (
                  <div key={participant.user_id} className="flex flex-col items-center gap-1">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={participant.avatar_url} alt={participant.display_name} />
                      <AvatarFallback className="text-xs">
                        {participant.display_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-center truncate w-full">
                      {participant.display_name}
                    </span>
                    {participant.role === 'admin' && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        Admin
                      </Badge>
                    )}
                  </div>
                ))}
                {floqDetails.participants.length > 8 && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-medium">
                        +{floqDetails.participants.length - 8}
                      </span>
                    </div>
                    <span className="text-xs text-center text-muted-foreground">
                      more
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button
                onClick={handleJoinToggle}
                disabled={joinFloq.isPending || leaveFloq.isPending}
                className={cn(
                  "flex-1",
                  floqDetails.is_creator 
                    ? "bg-muted hover:bg-muted text-muted-foreground cursor-default" 
                    : floqDetails.is_joined 
                      ? "bg-destructive hover:bg-destructive/90" 
                      : ""
                )}
              >
                {joinFloq.isPending || leaveFloq.isPending ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : floqDetails.is_creator ? (
                  "You're the host"
                ) : floqDetails.is_joined ? (
                  <>
                    <UserMinus className="w-4 h-4 mr-2" />
                    Leave Floq
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Join Floq
                  </>
                )}
              </Button>
            </div>
            
            {/* Secondary action row */}
            {(floqDetails.is_joined || floqDetails.is_creator) && (
              <div className="flex gap-2 flex-wrap">
                {/* End Floq for persistent hosts */}
                {floqDetails.is_creator && !floqDetails.ends_at && (
                  <IconPill
                    icon={<X className="w-3 h-3" />}
                    label="End Floq"
                    onClick={() => setShowEndConfirm(true)}
                    disabled={isEndingFloq}
                    variant="destructive"
                  />
                )}
                
                <IconPill
                  icon={<Zap className="w-3 h-3" />}
                  label="Boost"
                  onClick={() => {
                    // TODO: Implement boost functionality
                    console.log('Boost floq');
                  }}
                />
                
                <IconPill
                  icon={<UserPlus2 className="w-3 h-3" />}
                  label="Invite"
                  onClick={() => setShowInvite(true)}
                />
                
                <IconPill
                  icon={<MessageCircle className="w-3 h-3" />}
                  label="Chat"
                  onClick={() => setShowChat(true)}
                />
              </div>
            )}
          </div>

          {/* Bottom padding for scroll clearance */}
          <div className="pb-8" />
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
      
      {/* Chat Component */}
      {floqId && (
        <FloqChat 
          floqId={floqId}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />
      )}
      
      {/* End Floq Confirmation Dialog */}
      <EndFloqConfirmDialog
        isOpen={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        onConfirm={async () => {
          try {
            await endFloq(floqDetails.id);
            successFeedback();
            setShowEndConfirm(false);
            goBack();
          } catch (error) {
            console.error('Failed to end floq:', error);
            errorFeedback();
          }
        }}
        isLoading={isEndingFloq}
      />
    </div>
  );
};

export default FloqDetail;