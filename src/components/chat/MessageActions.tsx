import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Reply, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

type MessageActionsProps = {
  messageId: string;
  anchorRef: React.RefObject<HTMLElement>;
  onReact: (emoji: string, messageId: string) => void;
  onReply: (messageId: string) => void;
  onClose?: () => void;
};

const EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢'];

export function MessageActionsPopout({
  messageId,
  anchorRef,
  onReact,
  onReply,
  onClose
}: MessageActionsProps) {
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const popRef = useRef<HTMLDivElement>(null);

  // Position the popout **below** the anchor, centered, clamped to viewport
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const w = popRef.current?.offsetWidth ?? 220;
    const h = popRef.current?.offsetHeight ?? 44;

    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - w - 8));
    const top = Math.min(window.innerHeight - h - 8, rect.bottom + 8);

    setPos({ top, left });
  }, [anchorRef]);

  // Close on click outside / ESC
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!popRef.current.contains(e.target) && !anchorRef.current?.contains(e.target)) {
        onClose?.();
      }
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose, anchorRef]);

  const portalRoot = useMemo(() => {
    let node = document.getElementById('ui-portal-root') as HTMLDivElement | null;
    if (!node) {
      node = document.createElement('div');
      node.id = 'ui-portal-root';
      Object.assign(node.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '100000',        // above your Sheet (9999)
        pointerEvents: 'none',   // the container ignores clicks
      });
      document.body.appendChild(node);
    }
    return node;
  }, []);

  const node = (
    <div
      ref={popRef}
      onMouseDown={(e) => e.stopPropagation()} // don't bubble to sheet/draggers
      style={{
        top: pos.top,
        left: pos.left,
        position: 'fixed',
        zIndex: 100001,         // higher than the portal root just in case
        pointerEvents: 'auto',  // THIS grabs the cursor
      }}
      className="rounded-2xl border border-border/60 bg-background/95 backdrop-blur shadow-lg px-2 py-1 flex items-center gap-1 select-none"
    >
      {EMOJIS.map((e) => (
        <button
          key={e}
          className="h-8 w-8 rounded-full hover:bg-muted/70 flex items-center justify-center text-lg cursor-pointer"
          onClick={() => {
            onReact(e, messageId);
            onClose?.();
          }}
          aria-label={`React ${e}`}
        >
          {e}
        </button>
      ))}

      <div className="w-px h-6 bg-border/60 mx-1" />

      <button
        className="h-8 w-8 rounded-full hover:bg-muted/70 flex items-center justify-center cursor-pointer"
        onClick={() => {
          onReply(messageId);
          onClose?.();
        }}
        aria-label="Reply"
        title="Reply"
      >
        <Reply className="h-4 w-4" />
      </button>
    </div>
  );

  return createPortal(node, portalRoot);
}

export function MessageActionsTrigger({
  onOpen,
  className
}: { onOpen: (btn: HTMLButtonElement) => void; className?: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={btnRef}
      onClick={(e) => { e.stopPropagation(); if (btnRef.current) onOpen(btnRef.current); }}
      className={cn(
        "h-8 w-8 rounded-full border shadow flex items-center justify-center transition-colors",
        "bg-white/10 hover:bg-white/20",  // <-- light translucent background
        "text-white hover:text-white",     // <-- icon stays light
        className
      )}
      aria-label="Message actions"
      title="Reactions & reply"
      style={{ zIndex: 9999 }}
    >
      <Smile className="h-4 w-4" />
    </button>
  );
}