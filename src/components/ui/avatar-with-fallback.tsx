import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/avatar';

interface AvatarWithFallbackProps {
  src?: string | null;
  fallbackText?: string;
  className?: string;
  size?: number;
}

export const AvatarWithFallback = ({ 
  src, 
  fallbackText = 'U', 
  className = '',
  size = 64 
}: AvatarWithFallbackProps) => {
  const [failed, setFailed] = useState(false);

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
      <AvatarFallback className="gradient-secondary">
        {getInitials(fallbackText)}
      </AvatarFallback>
    </Avatar>
  );
};