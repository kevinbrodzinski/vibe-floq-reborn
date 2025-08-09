import { cn } from '@/lib/utils';
import { useCurrentUserId } from '@/hooks/useCurrentUser';

type SenderProfile = {
  display_name?: string;
  username?: string;
  avatar_url?: string;
};

type Message = {
  id: string;
  thread_id: string;
  content?: string | null;
  created_at: string;
  profile_id?: string;
  sender_id?: string;         // legacy
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  reply_to?: string | null;
  reply_to_msg?: {
    id: string | null;
    profile_id: string | null;
    content: string | null;
    created_at: string | null;
  } | null;
  reactions?: Array<{ emoji: string; count: number; reactors: string[] }>;
};

export function MessageBubble({
  message,
  isOwn,
  isConsecutive,
  senderProfile,
}: {
  message: Message;
  isOwn: boolean;
  isConsecutive: boolean;
  senderProfile?: SenderProfile | null;
}) {
  // Bubble colors
  const bubbleClasses = isOwn
    ? 'bg-primary text-primary-foreground rounded-tr-md'
    : 'bg-muted text-foreground rounded-tl-md';

  return (
    <div
      className={cn(
        'relative w-fit max-w-[72vw] sm:max-w-[72%] px-3 py-2 rounded-2xl shadow-sm select-text',
        'whitespace-pre-wrap break-words [word-break:break-word]',
        bubbleClasses,
        message.status === 'sending' && 'opacity-70'
      )}
      data-mid={message.id}
    >
      {/* Reply preview (faded) */}
      {message.reply_to && message.reply_to_msg?.id && (
        <div
          className={cn(
            'mb-2 text-xs pl-2 border-l-2',
            isOwn ? 'border-primary/40' : 'border-foreground/20'
          )}
        >
          <div className="opacity-70 line-clamp-2">
            {message.reply_to_msg?.content ?? '(deleted message)'}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="text-sm leading-relaxed">
        {message.content ?? ''}
      </div>
    </div>
  );
}