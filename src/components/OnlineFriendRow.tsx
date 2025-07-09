import { memo } from 'react';
import { useProfile } from '@/hooks/useProfileCache';
import { useFriendsPresence } from '@/hooks/useFriendsPresence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const OnlineFriendRow = memo(({ userId }: { userId: string }) => {
  const { data: p }   = useProfile(userId);
  const statusMap     = useFriendsPresence();
  const online        = statusMap[userId] === 'online';

  if (!p) {
    return <div className="h-12 animate-pulse bg-muted/30 rounded" />;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarImage src={p.avatar_url ?? ''} />
          <AvatarFallback>
            {p.display_name?.slice(0,2).toUpperCase() ?? '??'}
          </AvatarFallback>
        </Avatar>
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background" />
        )}
      </div>

      <span className="text-sm">@{p.display_name}</span>
    </div>
  );
});