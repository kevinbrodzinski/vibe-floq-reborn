import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, MapPin, MessageCircle, UserPlus, UserMinus, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { useNearbyFriends } from '@/hooks/useNearbyFriends';
import { useUnreadDMCounts } from '@/hooks/useUnreadDMCounts';
import { useLastSeen } from '@/hooks/useLastSeen';
import { useProfile } from '@/hooks/useProfile';
import { useFriendsPresence } from '@/hooks/useFriendsPresence';
import { useFriendSparkline } from '@/hooks/useFriendSparkline';
import { useLongPress } from '@/hooks/useLongPress';
import { useLiveShareFriends } from '@/hooks/useLiveShareFriends';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import dayjs from '@/lib/dayjs';
import { FriendRowSkeleton } from '@/components/skeletons';
import { AvatarWithLoading } from '@/components/ui/avatar-with-loading';
import { MiniPath } from '@/components/ui/MiniPath';
import { UserTag } from '@/components/ui/user-tag';
import { PresenceBadge } from '@/components/ui/PresenceBadge';
import { FriendShareToggle } from '@/components/friends/FriendShareToggle';
import { DMQuickSheet } from '@/components/DMQuickSheet';
import { Profile } from '@/types/profile';

interface OnlineFriendRowProps {
  profileId: string;
  isNearby?: boolean;
  distance?: number;
}

export const OnlineFriendRow = memo(({ profileId, isNearby, distance }: OnlineFriendRowProps) => {
  const navigate = useNavigate();
  const { data: p, isLoading, isError } = useProfile(profileId);
  const typedP = p as Profile | undefined;
  const statusMap = useFriendsPresence();
  const { data: sparklineData = [] } = useFriendSparkline(profileId);
  const status = statusMap[profileId];
  const online = status?.status === 'online' && status?.visible;
  const [dmOpen, setDmOpen] = useState(false);
  const lastSeen = useLastSeen(profileId);

  // Simplified share preference query to avoid type loops
  type SharePref = { is_live: boolean }
  const { data: pref, error: prefError } = useQuery<boolean>({
    queryKey: ['share-pref', profileId],
    gcTime: 5 * 60_000,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_share_pref')
        .select('is_live')
        .eq('other_profile_id', profileId)
        .maybeSingle()
        .returns<SharePref | null>();
      if (error) throw error;
      return data?.is_live ?? false;
    },
    retry: false,
  });

  // Get current user ID for unread counts
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { data: unreadCounts = [] } = useUnreadDMCounts(currentUserId);

  // Get unread count for this friend
  // Note: The unread counts API changed format - need to adapt based on new structure
  const unreadCount = 0; // Temporary fix until we understand the new 'kind' structure

  // Get current user ID on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Long-press to open DM, click to view profile
  const longPressGestures = useLongPress({
    onLongPress: () => setDmOpen(true)
  });

  const handleClick = () => {
    if ((typedP as any)?.username) {
      navigate(`/u/${(typedP as any).username}`);
    }
  };

  if (isLoading) {
    return <FriendRowSkeleton showDistance={isNearby} />;
  }

  if (isError || !p) {
    console.error(`❌ [FRIEND_ROW] Failed to load profile for user: ${profileId}`);
    return null; // Don't render broken friend rows
  }

  const formatDistance = (distanceM?: number) => {
    if (!distanceM) return '';
    if (distanceM < 1000) return `${Math.round(distanceM)}m`;
    return `${(distanceM / 1000).toFixed(1)}km`;
  };

  return (
    <>
      <div
        {...longPressGestures.handlers}
        onClick={handleClick}
        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 ${isNearby ? 'bg-primary/5 border border-primary/20' : ''}`}
        data-test-avatar={profileId}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <div className="relative">
          <AvatarWithLoading
            avatarPath={(typedP as any)?.avatar_url}
            displayName={(typedP as any)?.display_name}
            username={(typedP as any)?.username}
            profileId={(typedP as any)?.id}
            size={32}
            className="h-8 w-8"
          />
          {online && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center p-0 min-w-[20px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {(sparklineData as any)?.length ? <MiniPath pts={sparklineData as any} /> : null}
        </div>

        {/* Main Content Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <UserTag profile={(typedP as any) || {}} className="truncate font-medium" />
            {online
              ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              : lastSeen && <PresenceBadge kind="lastSeen" ts={lastSeen} />}
          </div>

          {/* Status and Location Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isNearby && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{formatDistance(distance)}</span>
              </div>
            )}

            {/* Location Sharing Status */}
            {pref !== undefined && !prefError && (
              <div className="flex items-center gap-1">
                {pref ? (
                  <>
                    <Wifi className="h-3 w-3 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">Sharing location</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-500">Location hidden</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Section */}
        <div className="flex items-center gap-3 ml-auto" onClick={(e) => e.stopPropagation()}>
          {/* Location Sharing Toggle */}
          {pref !== undefined && !prefError && (
            <div className="flex flex-col items-end gap-1">
              <div className="text-xs text-muted-foreground mb-1">
                {(pref as boolean) ? 'Live' : 'Hidden'}
              </div>
              <FriendShareToggle friendId={profileId} initial={pref as boolean} />
            </div>
          )}
        </div>
      </div>

      {/* DM Quick Sheet */}
      <DMQuickSheet
        open={dmOpen}
        onOpenChange={setDmOpen}
        friendId={profileId}
      />
    </>
  );
});