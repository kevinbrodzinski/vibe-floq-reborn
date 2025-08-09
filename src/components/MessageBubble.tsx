import { cn } from '@/lib/utils';

export type BubbleReaction = { emoji: string; count: number; reactors: string[] };

export function MessageBubble({
  content,
  isOwn,
  reply_to_id,
  created_at,
  reactions = [],
  onReact,
  onReply,
}: {
  content: string | null | undefined;
  isOwn: boolean;
  reply_to_id?: string | null;
  created_at: string;
  reactions?: BubbleReaction[];
  onReact?: (emoji: string) => void;
  onReply?: () => void;
}) {
  return (
    <div className="w-full">
      {/* reply preview (if any) */}
      {reply_to_id && (
        <div className={cn(
          'text-xs opacity-75 mb-2 pl-2 border-l-2',
          isOwn ? 'border-blue-300' : 'border-gray-400'
        )}>
          Replying to message…
        </div>
      )}

      {/* bubble */}
      <div
        className={cn(
          'inline-block px-3 py-2 rounded-2xl shadow-sm max-w-full',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-tr-md'
            : 'bg-muted text-foreground rounded-tl-md'
        )}
      >
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {content}
        </div>
      </div>

      {/* reactions row (from server/cache) */}
      {reactions.length > 0 && (
        <div className={cn('mt-1 flex gap-2 items-center flex-wrap', isOwn ? 'justify-end' : 'justify-start')}>
          {reactions.map((r) => (
            <button
              key={r.emoji}
              className="text-xs rounded px-1 border transition-colors hover:bg-muted/50 border-border/50 bg-background/40"
              onClick={() => onReact?.(r.emoji)}
              title={`${r.count} reactions`}
            >
              {r.emoji} {r.count}
            </button>
          ))}
        </div>
      )}

      {/* time (keep simple) */}
      <div className={cn('mt-1 text-[11px] text-muted-foreground', isOwn ? 'text-right' : 'text-left')}>
        {new Date(created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </div>
    </div>
  );
}