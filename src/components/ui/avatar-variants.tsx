import { EnhancedAvatar } from './enhanced-avatar';
import { type AvatarSize } from '@/lib/avatar';

interface AvatarVariantProps {
  avatarPath?: string | null;
  displayName?: string | null;
  className?: string;
  enableBlur?: boolean;
  priority?: boolean;
}

// Micro avatar for notifications, badges, etc
export const MicroAvatar = (props: AvatarVariantProps) => (
  <EnhancedAvatar size="xs" {...props} />
);

// Small avatar for lists, comments, etc
export const SmallAvatar = (props: AvatarVariantProps) => (
  <EnhancedAvatar size="sm" {...props} />
);

// Medium avatar for cards, default use
export const MediumAvatar = (props: AvatarVariantProps) => (
  <EnhancedAvatar size="md" {...props} />
);

// Large avatar for profiles, prominent display
export const LargeAvatar = (props: AvatarVariantProps) => (
  <EnhancedAvatar size="lg" {...props} />
);

// Extra large avatar for profile pages, hero sections
export const XLAvatar = (props: AvatarVariantProps) => (
  <EnhancedAvatar size="xl" enableBlur priority {...props} />
);

// Gigantic avatar for profile editing, detailed view
export const XXLAvatar = (props: AvatarVariantProps) => (
  <EnhancedAvatar size="xxl" enableBlur priority {...props} />
);

// Avatar grid for showing multiple users
interface AvatarGridProps {
  users: Array<{
    avatarPath?: string | null;
    displayName?: string | null;
    id: string;
  }>;
  size?: AvatarSize;
  maxDisplay?: number;
  className?: string;
}

export const AvatarGrid = ({ 
  users, 
  size = 'sm', 
  maxDisplay = 5,
  className 
}: AvatarGridProps) => {
  const displayUsers = users.slice(0, maxDisplay);
  const remainingCount = Math.max(0, users.length - maxDisplay);

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {displayUsers.map((user) => (
        <EnhancedAvatar
          key={user.id}
          avatarPath={user.avatarPath}
          displayName={user.displayName}
          size={size}
          className="border-2 border-background"
        />
      ))}
      
      {remainingCount > 0 && (
        <div className="flex items-center justify-center bg-muted text-muted-foreground border-2 border-background rounded-full text-xs font-medium"
             style={{ 
               width: typeof size === 'string' ? (size === 'xs' ? 32 : size === 'sm' ? 48 : 64) : size, 
               height: typeof size === 'string' ? (size === 'xs' ? 32 : size === 'sm' ? 48 : 64) : size 
             }}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
};