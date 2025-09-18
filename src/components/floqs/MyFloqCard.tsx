import React from 'react';
import { FloqAvatar } from './FloqAvatar';
import type { MyFloq } from '@/hooks/useMyFloqs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Crown, Clock, MessageCircle, Zap } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useFloqPlans } from '@/hooks/useFloqPlans';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useFloqParticipants } from '@/hooks/useFloqParticipants';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface MyFloqCardProps {
  floq: MyFloq;
  onOpen?: (floq: MyFloq) => void;
}

export function MyFloqCard({ floq, onOpen }: MyFloqCardProps) {
  /* ————— dynamic data ————— */
  const { data: host, isLoading: hostLoading } = useProfile(floq.creator_id);
  const { data: plans } = useFloqPlans(floq.id);
  const { data: unreadCounts } = useUnreadCounts(floq.id);
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });
  const { data: prefs } = useUserPreferences(currentUser?.id);
  const { data: participants } = useFloqParticipants(floq.id, 3);

  /* ————— derived ————— */
  const nextPlan = plans?.[0] ?? null;
  const streak = prefs?.checkin_streak ?? 0;
  const unreadCount = unreadCounts?.unread_total ?? 0;
  const isLive =
    floq.starts_at &&
    new Date(floq.starts_at) <= new Date() &&
    (!floq.ends_at || new Date(floq.ends_at) > new Date());

  /* ————— accessibility ————— */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen?.(floq);
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => onOpen?.(floq)}
      className="cursor-pointer transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-primary/70 rounded-2xl relative"
    >
      <CardContent className="p-4">
        {/* Live indicator */}
        {isLive && (
          <span className="absolute top-3 right-3 text-green-500 text-xs font-medium">
            Live
          </span>
        )}

        {/* ---------- Header ---------- */}
        <div className="flex items-start gap-4 mb-3">
          {/* Avatar + host badge */}
          <div className="relative">
            <FloqAvatar floq={floq} size={64} glow />
            {floq.is_creator && (
              <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* Title / meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="truncate font-semibold text-foreground">
                {floq.title}
              </h3>
            </div>

            <p className="text-xs text-muted-foreground capitalize mb-1">
              {floq.primary_vibe} •&nbsp;
              {hostLoading ? (
                <Skeleton className="inline-block h-3 w-12" />
              ) : host?.display_name ? (
                <>Hosted by {host.display_name}</>
              ) : (
                '—'
              )}
            </p>

            {/* Member count + avatar stack */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3 opacity-70" />
                {floq.participant_count} member
                {floq.participant_count !== 1 ? 's' : ''}
              </div>

              <div className="flex -space-x-2">
                {(participants ?? []).slice(0, 3).map((p) => (
                  <img
                    key={p.profile_id}
                    src={p.avatar_url ?? '/avatar-placeholder.png'}
                    alt=""
                    loading="lazy"
                    className="w-6 h-6 rounded-full border-2 border-background object-cover"
                  />
                ))}
                {floq.participant_count > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-600 border-2 border-background flex items-center justify-center">
                    <span className="text-xs text-white">
                      +{floq.participant_count - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Description ---------- */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {floq.description || 'No description yet—add one!'}
        </p>

        {/* ---------- Footer row ---------- */}
        <div className="flex items-center justify-between">
          {/* Next plan */}
          <div className="flex items-center gap-2">
            {nextPlan && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  Next: {nextPlan.title} @{' '}
                  {new Date(nextPlan.planned_at).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Streak + unread */}
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1 text-xs text-orange-400">
                <Zap className="h-3 w-3" />
                <span>{streak} nights</span>
              </div>
            )}

            {unreadCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-blue-400">
                <MessageCircle className="h-3 w-3" />
                <span>{unreadCount}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}