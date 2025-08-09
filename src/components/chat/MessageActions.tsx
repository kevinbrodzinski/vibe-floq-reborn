import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Smile, CornerUpLeft } from 'lucide-react';
import { ReactionPicker } from '@/components/chat/ReactionPicker';

type Props = {
  onReply: () => void;                 // setReplyTo(msg.id)
  onReact: (emoji: string) => void;    // toggle(msg.id, emoji)
  size?: 'sm' | 'md';
};

export function MessageActions({ onReply, onReact, size = 'sm' }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-70 hover:opacity-100"
          aria-label="Open message actions"
        >
          <Smile className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        avoidCollisions
        className="z-[10050] px-2 py-1 rounded-2xl w-auto"  // > Sheet zIndex (9999), override width
      >
        <div className="flex items-center gap-2">
          {/* Reply action */}
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2 rounded-full flex items-center gap-1"
            onClick={() => { onReply(); setOpen(false); }}
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
            <span className="text-xs">Reply</span>
          </Button>

          {/* Emoji picker */}
          <ReactionPicker
            onPick={(e) => { onReact(e); setOpen(false); }}
            size="sm"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}