import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { useLazyImageLoading } from '@/hooks/useLazyImageLoading';

interface LazyAvatarProps {
  avatarPath?: string | null;
  displayName?: string | null;
  size?: number;
  className?: string;
}

export const LazyAvatar = ({ 
  avatarPath, 
  displayName, 
  size = 64,
  className 
}: LazyAvatarProps) => {
  const avatarUrl = getAvatarUrl(avatarPath, size);
  const { imgRef, src, isLoaded, isVisible, onLoad, onError } = useLazyImageLoading(avatarUrl);

  if (!avatarUrl) {
    return (
      <Avatar className={className} style={{ width: size, height: size }}>
        <AvatarFallback>
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className="relative">
      {!isLoaded && isVisible && (
        <Skeleton 
          className="absolute inset-0 rounded-full" 
          style={{ width: size, height: size }} 
        />
      )}
      <Avatar 
        className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        style={{ width: size, height: size }}
      >
        <AvatarImage 
          ref={imgRef}
          src={src}
          onLoad={onLoad}
          onError={onError}
        />
        <AvatarFallback>
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};