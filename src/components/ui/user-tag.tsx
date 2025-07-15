import { Profile } from '@/hooks/useProfileCache';
import { cn } from '@/lib/utils';

interface UserTagProps {
  profile: Profile;
  showUsername?: boolean;
  className?: string;
}

export const UserTag = ({ profile, showUsername = true, className }: UserTagProps) => {
  const primary = profile.full_name?.trim() || profile.display_name;
  
  return (
    <div className={cn("inline-flex flex-col sm:flex-row sm:items-center sm:gap-1 min-w-0", className)} title={profile.username}>
      {primary && (
        <span className="font-medium text-sm truncate">{primary}</span>
      )}
      {showUsername && (
        <span className="text-muted-foreground text-xs truncate">@{profile.username}</span>
      )}
    </div>
  );
};