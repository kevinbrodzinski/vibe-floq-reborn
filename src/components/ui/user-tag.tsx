import { Profile } from '@/hooks/useProfileCache';
import { cn } from '@/lib/utils';

interface UserTagProps {
  profile: Profile;
  showUsername?: boolean;
  className?: string;
}

export const UserTag = ({ profile, showUsername = true, className }: UserTagProps) => {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="font-medium">{profile.display_name}</span>
      {showUsername && (
        <span className="text-muted-foreground text-sm">@{profile.username}</span>
      )}
    </span>
  );
};