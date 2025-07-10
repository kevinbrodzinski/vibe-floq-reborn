import { EnhancedAvatar } from './enhanced-avatar';

interface LazyAvatarProps {
  avatarPath?: string | null;
  displayName?: string | null;
  size?: number;
  className?: string;
}

/**
 * @deprecated Use EnhancedAvatar instead for better performance and blur-up loading
 */
export const LazyAvatar = ({ 
  avatarPath, 
  displayName, 
  size = 64,
  className 
}: LazyAvatarProps) => {
  return (
    <EnhancedAvatar
      avatarPath={avatarPath}
      displayName={displayName}
      size={size}
      className={className}
      enableBlur={true}
    />
  );
};