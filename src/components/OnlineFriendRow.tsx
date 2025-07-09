import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfileCache } from '@/hooks/useProfileCache';

interface OnlineFriendRowProps {
  userId: string;
}

export const OnlineFriendRow = ({ userId }: OnlineFriendRowProps) => {
  const { useProfile } = useProfileCache();
  const profile = useProfile(userId);

  if (!profile) {
    // Fallback for when profile is not in cache
    return (
      <div className="flex items-center gap-2 py-1">
        <Avatar className="w-6 h-6">
          <AvatarFallback className="text-xs">??</AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <Avatar className="w-6 h-6">
        <AvatarImage src={profile.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {profile.display_name?.slice(0, 2).toUpperCase() || '??'}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">
        {profile.display_name || 'Unknown User'}
      </span>
    </div>
  );
};