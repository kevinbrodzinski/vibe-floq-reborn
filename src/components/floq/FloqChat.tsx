import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useFloqChat } from '@/hooks/useFloqChat';
import { useSession } from '@supabase/auth-helpers-react';
import { MessageBubble } from './MessageBubble';
import { cn } from '@/lib/utils';

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

  // Check auth state with proper loading distinction
  if (!session) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Please sign in to access chat</p>
        </div>
      </div>
    );
  }
  
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef(new Set<string>());

  const {
    messages,
    hasNextPage,
    fetchNextPage,
    isLoading,
    sendMessage,
    isSending,
  } = useFloqChat(floqId);

  // Derive canSend from props and state with fallback for edge cases
  const hasContent = !!message.trim() && message.trim().length > 0;
  const canSend = !!floqId && !!user && hasContent && isJoined;

  // Smart auto-scroll to bottom on new messages (throttled for performance)
  useEffect(() => {
    if (!messagesEndRef.current || !messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    
    // Only auto-scroll if user is near the bottom, throttled with RAF
    if (isNearBottom) {
      const rafId = requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
      
      return () => {
        cancelAnimationFrame(rafId);
      };
    }
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Cleanup message IDs when switching floqs
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
      console.error('Failed to send message:', error);
    }
  };

  const handleEmojiSend = async (emoji: string) => {
    if (!canSend || isSending) return;

    try {
      await sendMessage({ emoji });
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Failed to send emoji:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend && !isSending) {
        handleSend();
      }
    }
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
          <div className="text-center py-12">
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start the conversation!
            </p>
          </div>
        ) : (
          <>
            {hasNextPage && (
              <div className="text-center pb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => fetchNextPage()}
                  className="text-xs"
                >
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
        {/* Emoji picker */}
        {showEmojiPicker && (
          <Card className="mb-3 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Quick reactions</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowEmojiPicker(false)}
              >
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
                  aria-label={`Send ${emoji} reaction`}
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
            className="flex-shrink-0"
            aria-label="Open emoji picker"
          >
            <Smile className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-[120px] resize-none pr-12"
              disabled={isSending}
              aria-label="Type your message"
            />
            <Button
              onClick={handleSend}
              disabled={!canSend || isSending}
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              aria-label="Send message"
            >
              {isSending ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </Button>
            
            {/* Debug info for send button - development only */}
            {process.env.NODE_ENV === 'development' && !canSend && (
              <div className="absolute -bottom-6 right-0 text-xs text-destructive">
                {!floqId ? 'No floq ID' : !user ? 'Not authenticated' : !isJoined ? 'Join floq first' : 'Type something'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (trigger) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] sm:h-[70vh]">
          <SheetHeader>
            <SheetTitle>Floq Chat</SheetTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="absolute top-4 right-4"
              autoFocus
              aria-label="Close chat"
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
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Floq Chat</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {content}
    </Card>
  );
};