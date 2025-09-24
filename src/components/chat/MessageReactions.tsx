import React from 'react';
import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  count: number;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onReact?: (emoji: string) => void;
  className?: string;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onReact,
  className
}) => {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1 mt-1", className)}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onReact?.(reaction.emoji)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 hover:bg-muted text-xs transition-colors"
        >
          <span>{reaction.emoji}</span>
          <span className="text-muted-foreground">{reaction.count}</span>
        </button>
      ))}
    </div>
  );
};