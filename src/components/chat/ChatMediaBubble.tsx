import React from 'react';
import { Loader2 } from 'lucide-react';

interface ChatMediaBubbleProps {
  media: {
    bucket: string;
    key: string;
    type: string;
    size?: number;
  };
  className?: string;
}

export const ChatMediaBubble: React.FC<ChatMediaBubbleProps> = ({ media, className = '' }) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const mediaUrl = `${supabaseUrl}/storage/v1/object/public/${media.bucket}/${media.key}`;

  if (media.type.startsWith('image/')) {
    return (
      <img 
        src={mediaUrl}
        className={`rounded-lg max-w-xs ${className}`}
        alt="Shared image"
        loading="lazy"
      />
    );
  }

  if (media.type.startsWith('video/')) {
    return (
      <video 
        src={mediaUrl}
        className={`rounded-lg max-w-xs ${className}`}
        controls
        preload="metadata"
      />
    );
  }

  // Fallback for unknown media types
  return (
    <div className={`rounded-lg p-4 bg-muted flex items-center gap-2 ${className}`}>
      <Loader2 className="h-4 w-4" />
      <span className="text-sm">Media file ({media.type})</span>
    </div>
  );
};