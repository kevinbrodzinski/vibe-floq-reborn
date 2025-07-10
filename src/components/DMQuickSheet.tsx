import { useEffect, useRef, useState, useMemo } from 'react';
import { Send } from 'lucide-react';
import { useDMThread } from '@/hooks/useDMThread';
import { useProfile } from '@/hooks/useProfileCache';
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, isSending } = useDMThread(friendId);
  
  // Get friend profile
  const { data: friend } = useProfile(friendId || '');

  // Cache current user ID
  const currentUserId = useMemo(async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  }, []);

  // Resolve current user ID for comparison
  const [resolvedCurrentUserId, setResolvedCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    currentUserId.then(setResolvedCurrentUserId);
  }, [currentUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  

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
      <SheetContent side="bottom" className="h-[80vh] flex flex-col backdrop-blur-xl bg-background/80">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === resolvedCurrentUserId;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
              />
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-background/50 border-border/50"
              disabled={isSending}
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