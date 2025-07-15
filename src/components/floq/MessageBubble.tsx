import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FloqMessage } from '@/hooks/useFloqChat';
import { cn } from '@/lib/utils';
import { renderMentions } from '@/utils/mentions';
import { Link } from 'react-router-dom';

interface MessageBubbleProps {
  message: FloqMessage;
  isOwn: boolean;
}

const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'now';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
  return date.toLocaleDateString();
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwn 
}) => (
  <div className={cn("flex gap-3 mb-4", isOwn && "flex-row-reverse")}>
    {!isOwn && (
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={message.sender.avatar_url} alt={message.sender.display_name} />
        <AvatarFallback className="text-xs">
          {message.sender.display_name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    )}
    
    <div className={cn("flex flex-col max-w-[75%]", isOwn && "items-end")}>
      {!isOwn && (
        <span className="text-xs text-muted-foreground mb-1 px-1">
          {message.sender.display_name}
        </span>
      )}
      
      <div className={cn(
        "rounded-lg px-3 py-2 break-words",
        isOwn 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted"
      )}>
        {message.emoji ? (
          <span className="text-2xl">{message.emoji}</span>
        ) : (
          <p className="text-sm whitespace-pre-wrap">
            {renderMentions(message.body || '', (handle) => (
              <Link
                to={`/u/${handle}`}
                className="font-medium text-primary hover:underline"
              >
                @{handle}
              </Link>
            ))}
          </p>
        )}
      </div>
      
      <span className="text-[10px] text-muted-foreground mt-1 px-1">
        {formatMessageTime(message.created_at)}
      </span>
    </div>
  </div>
);