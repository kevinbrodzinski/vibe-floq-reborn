import { useProfile } from '@/hooks/useProfileCache';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/avatar';

interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  metadata?: any;
}

interface MessageBubbleProps {
  message: DirectMessage;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const { data: sender } = useProfile(message.sender_id);

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && (
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarImage src={sender?.avatar_url ? getAvatarUrl(sender.avatar_url) : undefined} />
          <AvatarFallback className="text-xs">
            {sender?.display_name?.[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
        <p className={`text-xs mt-1 opacity-70 ${
          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground/70'
        }`}>
          {new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>
    </div>
  );
}