import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/hooks/useAuth';
import { useFloqDetails } from '@/hooks/useFloqDetails';
import { useLiveFloqScore } from '@/hooks/useLiveFloqScore';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useNavigation } from '@/hooks/useNavigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useRateLimiter } from '@/hooks/useRateLimiter';
import { useEndFloq } from '@/hooks/useEndFloq';

import { PublicFloqPreview } from '@/components/floq/PublicFloqPreview';
import { JoinedFloqView } from '@/components/floq/JoinedFloqView';

// Using the shadcn/ui version we implemented
import MomentaryFloqDetail from '@/pages/MomentaryFloqDetail';

export default function FloqRoute() {
  const { floqId } = useParams<{ floqId: string }>();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { goBack } = useNavigation();
  const { successFeedback, errorFeedback } = useHapticFeedback();
  const { mutateAsync: endFloq, isPending: isEndingFloq } = useEndFloq();
  const { data: floqDetails, isLoading, error, refetch } = useFloqDetails(floqId, session?.user?.id);
  const { data: liveScore, error: scoreError } = useLiveFloqScore(floqId);
  const { joinFloq, leaveFloq } = useOfflineQueue();

  const { attempt: attemptJoinLeave } = useRateLimiter({
    maxAttempts: 3,
    windowMs: 30000,
    message: 'Please wait before trying to join/leave again',
  });

  useEffect(() => {
    if (error || scoreError) {
      const t = setTimeout(() => refetch(), 5000);
      return () => clearTimeout(t);
    }
  }, [error, scoreError, refetch]);

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
  const isMember = floqDetails.participants?.some(p => p.profile_id === session?.user?.id);
  const hasAccess = isHost || isMember;
  const isMomentary = floqDetails.flock_type === 'momentary';

  // Momentary + has access → show the new momentary screen
  if (isMomentary && hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-0 sm:p-4">
          <MomentaryFloqDetail
            floqId={floqDetails.id}
            title={floqDetails.name ?? floqDetails.title ?? 'Untitled Floq'}
            endsAt={floqDetails.ends_at ?? new Date(Date.now() + 4 * 3600_000).toISOString()}
          />
        </div>
      </div>
    );
  }

  // Fallback: existing experiences
  const handleJoin = async () => {
    if (!floqDetails || !attemptJoinLeave()) return;
    try {
      await joinFloq.mutateAsync(floqDetails.id);
      successFeedback();
    } catch (e) {
      console.error('Failed to join floq:', e);
      errorFeedback();
    }
  };

  const handleLeave = async () => {
    if (!floqDetails || !attemptJoinLeave()) return;
    try {
      await leaveFloq.mutateAsync(floqDetails.id);
      successFeedback();
    } catch (e) {
      console.error('Failed to leave floq:', e);
      errorFeedback();
    }
  };

  const handleEndFloq = async () => {
    try {
      await endFloq(floqDetails.id);
      successFeedback();
      goBack();
    } catch (e) {
      console.error('Failed to end floq:', e);
      errorFeedback();
    }
  };

  return hasAccess ? (
    <JoinedFloqView
      floqDetails={floqDetails}
      onLeave={handleLeave}
      isLeaving={leaveFloq.isPending}
      liveScore={liveScore}
      onEndFloq={isHost && !floqDetails.ends_at ? handleEndFloq : undefined}
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
}