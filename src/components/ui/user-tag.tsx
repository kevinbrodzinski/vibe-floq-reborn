import { Profile } from '@/hooks/useProfileCache';
import { cn } from '@/lib/utils';

interface UserTagProps {
  profile: Profile;
  showUsername?: boolean;
  className?: string;
}

export const UserTag = ({ profile, showUsername = true, className }: UserTagProps) => {
  return (
    <div className={cn("inline-flex items-center gap-1 min-w-0", className)}>
      <span className="font-medium text-sm truncate">{profile.display_name}</span>
      {showUsername && (
        <span className="text-muted-foreground text-xs truncate">@{profile.username}</span>
      )}
    </div>
  );
};