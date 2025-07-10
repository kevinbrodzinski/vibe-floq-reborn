import { memo } from 'react';
import { useProfile } from '@/hooks/useProfileCache';
import { useFriendsPresence } from '@/hooks/useFriendsPresence';
import { MapPin } from 'lucide-react';
import { AvatarWithLoading } from '@/components/ui/avatar-with-loading';

interface OnlineFriendRowProps {
  userId: string;
  isNearby?: boolean;
  distance?: number;
}

export const OnlineFriendRow = memo(({ userId, isNearby, distance }: OnlineFriendRowProps) => {
  const { data: p }   = useProfile(userId);
  const statusMap     = useFriendsPresence();
  const online        = statusMap[userId] === 'online';

  if (!p) {
    return <div className="h-12 animate-pulse bg-muted/30 rounded" />;
  }

  const formatDistance = (distanceM?: number) => {
    if (!distanceM) return '';
    if (distanceM < 1000) return `${Math.round(distanceM)}m`;
    return `${(distanceM / 1000).toFixed(1)}km`;
  };

  return (
    <div className={`flex items-center gap-3 p-2 rounded-md ${isNearby ? 'bg-primary/5 border border-primary/20' : ''}`}>
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
  );
});