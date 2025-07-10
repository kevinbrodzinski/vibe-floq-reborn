import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getAvatarUrl, getInitials } from '@/lib/avatar';

interface AvatarWithLoadingProps {
  avatarPath?: string | null;
  displayName?: string | null;
  size?: number;
  className?: string;
}

export const AvatarWithLoading = ({ 
  avatarPath, 
  displayName, 
  size = 64,
  className 
}: AvatarWithLoadingProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const avatarUrl = getAvatarUrl(avatarPath, size);

  if (!avatarUrl || hasError) {
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
      {isLoading && (
        <Skeleton 
          className="absolute inset-0 rounded-full" 
          style={{ width: size, height: size }} 
        />
      )}
      <Avatar 
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        style={{ width: size, height: size }}
      >
        <AvatarImage 
          src={avatarUrl}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
        <AvatarFallback>
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};