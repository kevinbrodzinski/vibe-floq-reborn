import { useEffect, useRef, useState } from 'react';
import { Send, User } from 'lucide-react';
import { Z } from '@/constants/zLayers';

import { useDMThread } from '@/hooks/useDMThread';
import { useProfile } from '@/hooks/useProfile';
import { useAdvancedGestures } from '@/hooks/useAdvancedGestures';
import { MessageBubble } from '@/components/MessageBubble';
import { UserTag } from '@/components/ui/user-tag';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { messages, sendMessage, isSending, isTyping, sendTyping, markAsRead } = useDMThread(friendId);
  
  // Swipe gesture for closing sheet
  const swipeGestures = useAdvancedGestures({
    onSwipeDown: () => onOpenChange(false)
  });
  
  // Get friend profile
  const { data: friend, isLoading: friendLoading, error: friendError } = useProfile(friendId || undefined);

  // Get current user ID and mark as read when sheet opens
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
    
    // Mark as read when sheet opens with optimistic badge update
    if (open && friendId && currentUserId) {
      if (import.meta.env.DEV) console.log('📖 DM sheet opened, marking as read for friend:', friendId);
      markAsRead();
      
      // Immediate optimistic update for badge responsiveness - fixed query key
      queryClient.invalidateQueries({ queryKey: ['dm-unread', currentUserId] });
    }
  }, [open, friendId, currentUserId, markAsRead, queryClient]);

  // Show error toast if friend profile fails to load
  useEffect(() => {
    if (friendError && open) {
      toast({
        title: "Error loading profile",
        description: "Unable to load friend's profile information.",
        variant: "destructive",
      });
    }
  }, [friendError, open, toast]);


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
      toast({
        title: "Message failed to send",
        description: "Please try again.",
        variant: "destructive",
      });
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
        className={`h-[calc(100vh-4rem)] flex flex-col backdrop-blur-xl bg-background/80 z-[${Z.dmSheet}]`}
        style={{ 
          maxHeight: 'calc(100vh - env(safe-area-inset-top) - 4rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)'
        }}
        {...swipeGestures.handlers}
      >
        <SheetHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            {friendLoading ? (
              <>
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex flex-col gap-1 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </>
            ) : friend ? (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={friend.avatar_url ? getAvatarUrl(friend.avatar_url) : undefined} />
                  <AvatarFallback className="text-xs">
                    {friend.display_name?.[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <UserTag profile={friend} showUsername={true} className="flex-1" />
              </>
            ) : (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <SheetTitle className="text-left">Direct Message</SheetTitle>
              </>
            )}
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
        <div className="p-4 border-t border-border/50 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
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