import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, getAvatarFallbackColor } from '@/lib/avatar';

interface AvatarWithFallbackProps {
  src?: string | null;
  fallbackText?: string;
  username?: string;
  userId?: string;
  className?: string;
  size?: number;
}

export const AvatarWithFallback = ({ 
  src, 
  fallbackText = 'U',
  username,
  userId,
  className = '',
  size = 64 
}: AvatarWithFallbackProps) => {
  const [failed, setFailed] = useState(false);

  // Generate initials from fallbackText, username as backup
  const initials = getInitials(fallbackText, username);
  
  // Generate deterministic color if userId provided
  const fallbackColor = userId ? getAvatarFallbackColor(userId) : undefined;

  // Phase 1B Fix: Proper avatar failure fallback
  if (src && !failed) {
    return (
      <Avatar className={className}>
        <AvatarImage 
          src={src}
          onError={() => setFailed(true)}
        />
      </Avatar>
    );
  }
  
  return (
    <Avatar className={className}>
      <AvatarFallback 
        className="text-white font-medium"
        style={fallbackColor ? { backgroundColor: fallbackColor } : undefined}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};