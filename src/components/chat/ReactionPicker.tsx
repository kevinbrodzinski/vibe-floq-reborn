import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Smile } from 'lucide-react';

type Props = {
  onPick: (emoji: string) => void;
  size?: 'sm' | 'md';
};

const EMOJIS = ['👍','❤️','😂','😮','😢','👎'];

export function ReactionPicker({ onPick, size = 'sm' }: Props) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  // mobile long-press support
  React.useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;

    let t: number | null = null;
    const down = () => { t = window.setTimeout(() => setOpen(true), 420); };
    const up = () => { if (t) { clearTimeout(t); t = null; } };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', up);
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-70 hover:opacity-100"
          aria-label="Add reaction"
          onClick={() => setOpen((v) => !v)}
        >
          <Smile className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="px-2 py-1 rounded-2xl flex gap-1"
      >
        {EMOJIS.map(e => (
          <button
            key={e}
            className="text-base leading-none hover:scale-110 transition-transform"
            onClick={() => { onPick(e); setOpen(false); }}
          >
            {e}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}