import { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfileCache';
import { useFriendsPresence } from '@/hooks/useFriendsPresence';
import { useUnreadDMCounts } from '@/hooks/useUnreadDMCounts';
import { MapPin } from 'lucide-react';
import { AvatarWithLoading } from '@/components/ui/avatar-with-loading';
import { Badge } from '@/components/ui/badge';
import { DMQuickSheet } from '@/components/DMQuickSheet';
import { FriendRowSkeleton } from '@/components/skeletons';
import { UserTag } from '@/components/ui/user-tag';
import { useLongPress } from '@/hooks/useLongPress';
import { useLastSeen } from '@/hooks/useLastSeen';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

interface OnlineFriendRowProps {
  userId: string;
  isNearby?: boolean;
  distance?: number;
}

// Initialize dayjs plugin
dayjs.extend(relativeTime);

export const OnlineFriendRow = memo(({ userId, isNearby, distance }: OnlineFriendRowProps) => {
  const navigate = useNavigate();
  const { data: p, isLoading, isError } = useProfile(userId);
  const statusMap = useFriendsPresence();
  const status = statusMap[userId];
  const online = status?.status === 'online' && status?.visible;
  const [dmOpen, setDmOpen] = useState(false);
  const lastSeen = useLastSeen(userId);
  
  // Get current user ID for unread counts
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { data: unreadCounts = [] } = useUnreadDMCounts(currentUserId);
  
  // Get unread count for this friend
  const unreadCount = unreadCounts.find(c => c.friend_id === userId)?.unread_count || 0;
  
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
    if (p?.username) {
      navigate(`/u/${p.username}`);
    }
  };

  if (isLoading) {
    return <FriendRowSkeleton showDistance={isNearby} />;
  }

  if (isError || !p) {
    console.error(`❌ [FRIEND_ROW] Failed to load profile for user: ${userId}`);
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
        data-test-avatar={userId}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <div className="relative">
          <AvatarWithLoading 
            avatarPath={p.avatar_url}
            displayName={p.display_name}
            username={p.username}
            userId={p.id}
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
        </div>

      <div className="flex-1 min-w-0">
        <UserTag profile={p} className="flex-col items-start sm:flex-row sm:items-center" />
        {lastSeen && (
          <div className="text-xs text-muted-foreground mt-0.5">
            Last seen {dayjs(lastSeen).fromNow()}
          </div>
        )}
      </div>

      {isNearby && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{formatDistance(distance)}</span>
        </div>
        )}
      </div>
      
      {/* DM Quick Sheet */}
      <DMQuickSheet
        open={dmOpen}
        onOpenChange={setDmOpen}
        friendId={userId}
      />
    </>
  );
});