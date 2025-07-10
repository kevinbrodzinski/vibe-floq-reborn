import { useEffect, useRef, useState, useMemo } from 'react';
import { Send } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { useDMThread } from '@/hooks/useDMThread';
import { useProfile } from '@/hooks/useProfileCache';
import { useAdvancedGestures } from '@/hooks/useAdvancedGestures';
import { MessageBubble } from '@/components/MessageBubble';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/avatar';
import { supabase } from '@/integrations/supabase/client';

interface DMQuickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendId: string | null;
}

export function DMQuickSheet({ open, onOpenChange, friendId }: DMQuickSheetProps) {
  const [input, setInput] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, isSending, isTyping, sendTyping, markAsRead } = useDMThread(friendId);
  
  // Swipe gesture for closing sheet
  const swipeGestures = useAdvancedGestures({
    onSwipeDown: () => onOpenChange(false)
  });
  
  // Get friend profile
  // const { data: friend } = useProfile(friendId || '');
  const friend = { display_name: 'Friend', avatar_url: null }; // Mock for now

  // Get current user ID and mark as read when sheet opens
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
    
    // Mark as read when sheet opens
    if (open && friendId) {
      markAsRead();
    }
  }, [open, friendId, markAsRead]);

  // Get unique sender IDs from messages
  const senderIds = useMemo(() => {
    return Array.from(new Set(messages.map(m => m.sender_id)));
  }, [messages]);

  // Temporarily disable sender profiles fetch
  // const senderProfiles = useQueries({...});
  
  const getProfile = (uid: string) => ({ 
    display_name: 'User', 
    avatar_url: null 
  }); // Mock for now

  // Auto-scroll to bottom with requestAnimationFrame
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    );
    return () => cancelAnimationFrame(id);
  }, [messages.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    // Send typing indicator on input
    if (e.target.value.length > 0) {
      sendTyping();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    
    try {
      await sendMessage(input.trim());
      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[80vh] flex flex-col backdrop-blur-xl bg-background/80"
        {...swipeGestures.handlers}
      >
        <SheetHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={friend?.avatar_url ? getAvatarUrl(friend.avatar_url) : undefined} />
              <AvatarFallback className="text-xs">
                {friend?.display_name?.[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <SheetTitle className="text-left">
              {friend?.display_name ?? 'Direct Message'}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          role="log"
          aria-label="Direct message conversation"
        >
          {messages.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
              />
            );
          })}
          {isTyping && (
            <div className="text-sm text-muted-foreground italic animate-pulse">
              {friend?.display_name} is typing...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-background/50 border-border/50"
              disabled={isSending}
              aria-label="Direct message input"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              size="icon"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}