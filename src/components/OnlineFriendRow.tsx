import { memo, useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfileCache';
import { useFriendsPresence } from '@/hooks/useFriendsPresence';
import { useUnreadDMCounts } from '@/hooks/useUnreadDMCounts';
import { MapPin } from 'lucide-react';
import { AvatarWithLoading } from '@/components/ui/avatar-with-loading';
import { Badge } from '@/components/ui/badge';
import { DMQuickSheet } from '@/components/DMQuickSheet';
import { useLongPress } from '@/hooks/useLongPress';
import { supabase } from '@/integrations/supabase/client';

interface OnlineFriendRowProps {
  userId: string;
  isNearby?: boolean;
  distance?: number;
}

export const OnlineFriendRow = memo(({ userId, isNearby, distance }: OnlineFriendRowProps) => {
  // const { data: p } = useProfile(userId);
  const p = { display_name: 'Friend', avatar_url: null }; // Mock for now
  const statusMap = useFriendsPresence();
  const online = statusMap[userId] === 'online';
  const [dmOpen, setDmOpen] = useState(false);
  
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

  // Long-press to open DM
  const longPressGestures = useLongPress({
    onLongPress: () => setDmOpen(true)
  });

  if (!p) {
    return <div className="h-12 animate-pulse bg-muted/30 rounded" />;
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
        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${isNearby ? 'bg-primary/5 border border-primary/20' : ''}`}
        data-test-avatar={userId}
      >
        <div className="relative">
          <AvatarWithLoading 
            avatarPath={p.avatar_url}
            displayName={p.display_name}
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
        <span className="text-sm truncate">@{p.display_name}</span>
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