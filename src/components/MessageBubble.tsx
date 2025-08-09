import { cn } from '@/lib/utils';
import { ReplyPreview } from './chat/ReplyPreview';

interface MessageBubbleProps {
  message: {
    content?: string | null;
    status?: 'sending' | 'sent' | 'delivered' | 'read';
    reply_to?: string | null;
    reply_to_msg?: {
      id: string | null;
      profile_id: string | null;
      content?: string | null;
    } | null;
  };
  isOwn?: boolean;
  className?: string;
}

export const MessageBubble = ({ message, isOwn = false, className }: MessageBubbleProps) => {
  const align = isOwn ? "right" : "left";

  const scrollToParent = () => {
    if (message.reply_to_msg?.id) {
      const el = document.querySelector(`[data-mid="${message.reply_to_msg.id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div
      className={cn(
        'relative px-3 py-2 rounded-2xl shadow-sm max-w-[70%]',
        'whitespace-pre-wrap break-words text-sm leading-relaxed',
        isOwn
          ? 'bg-primary text-primary-foreground rounded-tr-md ml-auto'
          : 'bg-muted text-foreground rounded-tl-md mr-auto',
        className
      )}
    >
      {/* Integrated reply preview */}
      {message.reply_to && message.reply_to_msg?.id && (
        <ReplyPreview
          text={message.reply_to_msg.content ?? ""}
          authorId={message.reply_to_msg.profile_id ?? undefined}
          onClick={scrollToParent}
          align={align}
          integrated={true}
        />
      )}

      {/* Content */}
      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {message.content ?? ''}
      </div>
    </div>
  );
};