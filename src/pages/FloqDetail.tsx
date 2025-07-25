import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PublicFloqPreview } from '@/components/floq/PublicFloqPreview';
import { JoinedFloqView } from '@/components/floq/JoinedFloqView';
import { useFloqDetails } from '@/hooks/useFloqDetails';
import { useLiveFloqScore } from '@/hooks/useLiveFloqScore';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useNavigation } from '@/hooks/useNavigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useRateLimiter } from '@/hooks/useRateLimiter';
import { useEndFloq } from '@/hooks/useEndFloq';
import { EndFloqConfirmDialog } from '@/components/EndFloqConfirmDialog';

const FloqDetail = () => {
  const { floqId } = useParams<{ floqId: string }>();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const { session, loading } = useAuth();
  
  const { goBack } = useNavigation();
  const navigate = useNavigate();
  const { successFeedback, errorFeedback } = useHapticFeedback();
  const { mutateAsync: endFloq, isPending: isEndingFloq } = useEndFloq();
  
  const { data: floqDetails, isLoading, error, refetch } = useFloqDetails(floqId, session?.user?.id);
  const { data: liveScore, error: scoreError } = useLiveFloqScore(floqId);
  const { joinFloq, leaveFloq } = useOfflineQueue();
  
  // Rate limiting for join/leave actions
  const { attempt: attemptJoinLeave } = useRateLimiter({
    maxAttempts: 3,
    windowMs: 30000, // 30 seconds
    message: "Please wait before trying to join/leave again",
  });

  const handleJoin = async () => {
    if (!floqDetails || !attemptJoinLeave()) return;
    
    try {
      await joinFloq.mutateAsync(floqDetails.id);
      successFeedback();
    } catch (error) {
      console.error('Failed to join floq:', error);
      errorFeedback();
    }
  };

  const handleLeave = async () => {
    if (!floqDetails || !attemptJoinLeave()) return;
    
    try {
      await leaveFloq.mutateAsync(floqDetails.id);
      successFeedback();
    } catch (error) {
      console.error('Failed to leave floq:', error);
      errorFeedback();
    }
  };

  const handleEndFloq = async () => {
    try {
      await endFloq(floqDetails!.id);
      successFeedback();
      setShowEndConfirm(false);
      goBack();
    } catch (error) {
      console.error('Failed to end floq:', error);
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

  // Wait for BOTH session and floq details to be ready
  if (loading || isLoading) {
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

  const isHost = floqDetails.creator_id === session?.user?.id;
  const isMember = floqDetails.participants?.some(p => p.user_id === session?.user?.id);

  // Don't early-return until we know definitively whether we're in or out
  const renderFloqView = () => {
    return (isHost || isMember) ? (
      <JoinedFloqView
        floqDetails={floqDetails}
        onLeave={handleLeave}
        isLeaving={leaveFloq.isPending}
        liveScore={liveScore}
        onEndFloq={isHost && !floqDetails.ends_at ? () => setShowEndConfirm(true) : undefined}
        isEndingFloq={isEndingFloq}
        onBack={goBack}
        onSettings={() => navigate(`/floqs/${floqDetails.id}/manage`)}
      />
    ) : (
      <PublicFloqPreview
        floqDetails={floqDetails}
        onJoin={handleJoin}
        isJoining={joinFloq.isPending}
        liveScore={liveScore}
      />
    );
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {renderFloqView()}
      </div>
      
      {/* End Floq Confirmation Dialog */}
      <EndFloqConfirmDialog
        isOpen={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        onConfirm={handleEndFloq}
        isLoading={isEndingFloq}
      />
    </div>
  );
};

export default FloqDetail;