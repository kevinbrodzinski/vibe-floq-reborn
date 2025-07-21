import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { Send, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useFloqChat } from '@/hooks/useFloqChat';
import { useSession } from '@supabase/auth-helpers-react';
import { MessageBubble } from './MessageBubble';
import { cn } from '@/lib/utils';
import { MentionDropdown } from '@/components/MentionDropdown';
import { useLocation, Link } from 'react-router-dom';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { getActiveMention, insertMention } from '@/utils/mentions';

interface FloqChatProps {
  floqId: string;
  isOpen: boolean;
  onClose: () => void;
  trigger?: React.ReactNode;
  isJoined?: boolean;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥'];

export const FloqChat: React.FC<FloqChatProps> = ({ 
  floqId, 
  isOpen, 
  onClose, 
  trigger,
  isJoined = false
}) => {
  const session = useSession();
  const user = session?.user;

  if (!isJoined) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Join this floq to access chat</p>
        </div>
      </div>
    );
  }

  const [message, setMessage] = useState('');
  const [caret, setCaret] = useState<number>(0);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef(new Set<string>());

  const { messages, hasNextPage, fetchNextPage, isLoading, sendMessage, isSending } = useFloqChat(floqId);
  const track = useActivityTracking(floqId);

  const activeMention = useMemo(
    () => getActiveMention(message, caret),
    [message, caret]
  );

  useLayoutEffect(() => {
    if (!activeMention || !textareaRef.current) return setAnchor(null);

    const ta = textareaRef.current;
    const { start } = activeMention;
    const style = window.getComputedStyle(ta);
    const div = document.createElement('div');

    [
      'font', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'border', 'borderWidth', 'borderStyle', 'borderColor',
      'boxSizing', 'whiteSpace', 'overflowWrap', 'wordWrap',
      'lineHeight', 'letterSpacing', 'textIndent', 'textTransform'
    ].forEach((prop) => (div.style as any)[prop] = style[prop]);

    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.width = style.width;

    div.textContent = ta.value.slice(0, start);
    document.body.appendChild(div);

    try {
      const rect = div.getBoundingClientRect();
      const taRect = ta.getBoundingClientRect();
      const scrollTop = ta.scrollTop;
      const zoom = window.visualViewport?.scale ?? 1;
      const lineHeight = parseFloat(style.lineHeight) || parseInt(style.fontSize) * 1.2;

      const x = taRect.left + (rect.width % ta.clientWidth) + parseInt(style.paddingLeft);
      const y = taRect.top + rect.height - scrollTop + parseInt(style.paddingTop) + lineHeight * 0.2;

      setAnchor(new DOMRect(x * zoom, y * zoom, 0, 0));
    } catch (e) {
      setAnchor(null);
    } finally {
      div.remove();
    }
  }, [activeMention]);

  const canSend = !!floqId && !!message.trim() && isJoined;

  useEffect(() => {
    if (isOpen) track('chat');
  }, [isOpen, track]);

  useEffect(() => {
    if (!messagesEndRef.current || !messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    if (isNearBottom) {
      const rafId = requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [messages.length]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  useEffect(() => {
    return () => {
      messageIdsRef.current.clear();
    };
  }, [floqId]);

  const handleSend = async () => {
    if (!canSend || isSending) return;
    try {
      await sendMessage({ body: message.trim() });
      setMessage('');
    } catch (error) {
      console.error('Send failed:', error);
    }
  };

  const handleEmojiSend = async (emoji: string) => {
    if (!canSend || isSending) return;
    try {
      await sendMessage({ emoji });
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Emoji send failed:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMentionSelect = (handle: string) => {
    if (!activeMention) return;
    const newVal = insertMention(message, { ...activeMention, handle });
    setMessage(newVal + ' ');
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-32 bg-muted animate-pulse rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted">
            <span className="text-4xl">👋</span>
            <p className="mt-2">Be the first to say hi</p>
          </div>
        ) : (
          <>
            {hasNextPage && (
              <div className="text-center pb-4">
                <Button variant="ghost" size="sm" onClick={fetchNextPage} className="text-xs">
                  Load older messages
                </Button>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === user?.id}
              />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        {showEmojiPicker && (
          <Card className="mb-3 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Quick reactions</span>
              <Button variant="ghost" size="sm" onClick={() => setShowEmojiPicker(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_REACTIONS.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="text-lg hover:bg-muted"
                  onClick={() => handleEmojiSend(emoji)}
                  disabled={!canSend || isSending}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </Card>
        )}

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={!canSend}
          >
            <Smile className="w-4 h-4" />
          </Button>

          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setCaret(e.target.selectionStart);
              }}
              onKeyUp={(e) => setCaret(e.currentTarget.selectionStart || 0)}
              onKeyPress={handleKeyPress}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-[120px] resize-none pr-12"
              disabled={isSending}
            />
            <Button
              onClick={handleSend}
              disabled={!canSend || isSending}
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            >
              {isSending ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>

        {activeMention && (
          <MentionDropdown
            anchorRect={anchor}
            query={activeMention.handle}
            onSelect={handleMentionSelect}
            onClose={() => setAnchor(null)}
          />
        )}
      </div>
    </div>
  );

  if (trigger) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] sm:h-[70vh]">
          <SheetHeader>
            <SheetTitle>Floq Chat</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-4 right-4"
              autoFocus
            >
              <X className="w-4 h-4" />
            </Button>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card className="h-[500px] flex flex-col">
      <div className="border-b border-border p-4 flex items-center justify-between">
        <h3 className="font-semibold">Floq Chat</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      {content}
    </Card>
  );
};