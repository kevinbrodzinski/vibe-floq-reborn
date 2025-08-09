import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Smile, Reply } from 'lucide-react';
import { cn } from '@/lib/utils';

type MessageActionsProps = {
  /** The message id we act on */
  messageId: string;
  /** Where to anchor the popout (usually the button ref) */
  anchorRef: React.RefObject<HTMLElement>;
  /** Called when user picks a reaction */
  onReact: (emoji: string, messageId: string) => void;
  /** Called when user taps reply */
  onReply: (messageId: string) => void;
  /** Optional: close when done */
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
  const [pos, setPos] = useState<{top:number; left:number}>({ top: 0, left: 0 });
  const popRef = useRef<HTMLDivElement>(null);

  // Position next to the anchor
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // place above-right of anchor
    setPos({
      top: Math.max(8, rect.top - 56),            // 56px tall pop – adjust
      left: Math.min(window.innerWidth - 220, rect.left - 8),
    });
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
    let node = document.getElementById('ui-portal-root');
    if (!node) {
      node = document.createElement('div');
      node.id = 'ui-portal-root';
      document.body.appendChild(node);
    }
    return node;
  }, []);

  const node = (
    <div
      ref={popRef}
      style={{ top: pos.top, left: pos.left, zIndex: 9999, position: 'fixed' }}
      className="rounded-2xl border border-border/60 bg-background/95 backdrop-blur shadow-lg px-2 py-1 flex items-center gap-1"
    >
      {/* Reactions row */}
      {EMOJIS.map((e) => (
        <button
          key={e}
          className="h-8 w-8 rounded-full hover:bg-muted/70 flex items-center justify-center text-lg"
          onClick={() => { onReact(e, messageId); onClose?.(); }}
          aria-label={`React ${e}`}
        >
          {e}
        </button>
      ))}

      <div className="w-px h-6 bg-border/60 mx-1" />

      {/* Reply action */}
      <button
        className="h-8 w-8 rounded-full hover:bg-muted/70 flex items-center justify-center"
        onClick={() => { onReply(messageId); onClose?.(); }}
        aria-label="Reply"
        title="Reply"
      >
        <Reply className="h-4 w-4" />
      </button>
    </div>
  );

  return createPortal(node, portalRoot);
}

/**
 * Small trigger button that shows the popout.
 * Place this inside each message row, positioned absolute.
 */
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
        "h-8 w-8 rounded-full bg-background/90 border border-border/50 shadow flex items-center justify-center",
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