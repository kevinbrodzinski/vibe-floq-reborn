import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, AVATAR_SIZES, type AvatarSize } from '@/lib/avatar';
import { useAvatarUrl, useAvatarBlurUrl } from '@/hooks/useAvatarUrl';
import { useLazyImageLoading } from '@/hooks/useLazyImageLoading';
import { cn } from '@/lib/utils';

interface EnhancedAvatarProps {
  avatarPath?: string | null;
  displayName?: string | null;
  size?: number | AvatarSize;
  className?: string;
  enableBlur?: boolean;
  priority?: boolean;
}

export const EnhancedAvatar = ({ 
  avatarPath, 
  displayName, 
  size = 'md',
  className,
  enableBlur = true,
  priority = false
}: EnhancedAvatarProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const pixelSize = typeof size === 'number' ? size : AVATAR_SIZES[size];
  const avatarUrl = useAvatarUrl(avatarPath, size);
  const blurUrl = useAvatarBlurUrl(avatarPath);
  
  const { src, isVisible } = useLazyImageLoading(priority ? avatarUrl : avatarUrl, {
    threshold: 0.1,
    rootMargin: '50px'
  });

  const handleLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  // Show initials if no avatar or error
  if (!avatarPath || imageError) {
    return (
      <Avatar 
        className={cn(className)}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className="relative" style={{ width: pixelSize, height: pixelSize }}>
      {/* Blur placeholder - shows immediately */}
      {enableBlur && blurUrl && !imageLoaded && (
        <Avatar 
          className={cn("absolute inset-0", className)}
          style={{ width: pixelSize, height: pixelSize }}
        >
          <AvatarImage 
            src={blurUrl}
            className="filter blur-sm scale-110 transition-opacity duration-300"
            style={{ 
              filter: 'blur(4px) brightness(0.8)',
              transform: 'scale(1.1)'
            }}
          />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Main avatar image */}
      <Avatar 
        className={cn(
          "relative transition-opacity duration-300",
          imageLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <AvatarImage 
          ref={imgRef}
          src={priority || isVisible ? src : undefined}
          onLoad={handleLoad}
          onError={handleError}
          className="object-cover"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      {/* Loading indicator */}
      {!imageLoaded && !imageError && avatarPath && (
        <div 
          className="absolute inset-0 bg-muted animate-pulse rounded-full flex items-center justify-center"
          style={{ width: pixelSize, height: pixelSize }}
        >
          <div className="w-1/3 h-1/3 bg-muted-foreground/20 rounded-full animate-bounce" />
        </div>
      )}
    </div>
  );
};