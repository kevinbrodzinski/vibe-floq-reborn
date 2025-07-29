
import React, { useState, useEffect, useRef, memo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Waypoint } from 'react-waypoint';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, UserPlus, Blocks, Flag, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { useUnreadDMCounts } from '@/hooks/useUnreadDMCounts';
import { useLastSeen } from '@/hooks/useLastSeen';
import { useFriends } from '@/hooks/useFriends';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useNearbyFriends } from '@/hooks/useNearbyFriends';
import { useLiveShareFriends } from '@/hooks/useLiveShareFriends';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { useToast } from '@/hooks/use-toast';
import { useChatTimeline } from '@/hooks/chat/useChatTimeline';
import { useReactToMessage } from '@/hooks/chat/useReactToMessage';
import { useSendMessage } from '@/hooks/chat/useSendMessage';
import { useMarkRead } from '@/hooks/chat/useMarkRead';
import { useUploadMedia } from '@/hooks/chat/useUploadMedia';
import { useAdvancedGestures } from '@/hooks/useAdvancedGestures';
import { useFriendsPresence } from '@/hooks/useFriendsPresence';
import { supabase } from '@/integrations/supabase/client';
import { rpc_markThreadRead, type Surface } from '@/lib/chat/api';
import { cn } from '@/lib/utils';
import dayjs from '@/lib/dayjs';
import { ChatMediaBubble } from '@/components/chat/ChatMediaBubble';

interface DMQuickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendId: string | null;
}

export const DMQuickSheet = memo(({ open, onOpenChange, friendId }: DMQuickSheetProps) => {
  const [input, setInput] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper to create stable thread ID
  const threadIdFrom = (fId: string | null) =>
    [currentUserId, fId].filter(Boolean).sort().join('-');

  // New chat hooks
  const surface: Surface = 'dm';
  const threadId = threadIdFrom(friendId);
  const timeline = useChatTimeline(surface, threadId, currentUserId ?? '', { 
    enabled: !!currentUserId && !!friendId && !!threadId 
  });
  const sendMut = useSendMessage(surface, threadId, currentUserId ?? '');
  const reactMut = useReactToMessage(surface, threadId, currentUserId ?? '');
  const markReadMut = useMarkRead(surface, threadId, currentUserId ?? '');

  const uploadMut = useUploadMedia(threadId, sendMut.mutateAsync);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<number | null>(null);

  // Debug logging for overlay management
  useEffect(() => {
    console.log('[DM_SHEET] Sheet state changed:', { open, friendId });
  }, [open, friendId]);

  // Swipe gesture for closing sheet
  const swipeGestures = useAdvancedGestures({
    onSwipeDown: () => onOpenChange(false)
  });

  // Get friend profile and presence
  const { data: friend, isLoading: friendLoading, error: friendError } = useProfile(friendId || undefined);
  const presence = useFriendsPresence()[friendId || ''];
  const online = presence?.status === 'online' && presence?.visible;
  const lastSeenTs = useLastSeen(friendId || '');

  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (open && currentUserId && friendId && threadId) {
      markReadMut.mutate();
      
      // Optimistically clear unread badge
      queryClient.setQueryData(
        ['dm-unread', currentUserId],
        (rows: any[]) => rows?.filter(r => r.thread_id !== threadId) ?? []
      );
    }
  }, [open, currentUserId, friendId, threadId, markReadMut, queryClient]);

  // Auto-focus input when sheet opens
  useEffect(() => {
    if (open && !timeline.isLoading) {
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, timeline.isLoading]);

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const messages = timeline.data?.pages.flatMap(p => p) ?? [];
    if (messages.length > 0) {
      const id = requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      );
      return () => cancelAnimationFrame(id);
    }
  }, [timeline.data?.pages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Typing indicator logic
    if (value.length === 1 && !isTyping) {
      setIsTyping(true);
      // TODO: Implement sendTyping('start') when ready
    }
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to stop typing indicator
    const timeout = window.setTimeout(() => {
      setIsTyping(false);
      // TODO: Implement sendTyping('stop') when ready
    }, 3000);
    
    setTypingTimeout(timeout);
  };

  // Auto-clear typing when input becomes empty
  useEffect(() => {
    if (!input && isTyping) {
      setIsTyping(false);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }
  }, [input, isTyping, typingTimeout]);

  const handleSend = async () => {
    if (!input.trim() || sendMut.isPending) return;

    // Clear typing state immediately
    setIsTyping(false);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }

    try {
      await sendMut.mutateAsync({ text: input.trim() });
      setInput('');
      
      // Note: sendMut already invalidates queries optimistically, but keeping for safety
      queryClient.invalidateQueries({ queryKey: ['dm-threads', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['dm-unread', currentUserId] });
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
        className={`h-[calc(100vh-4rem)] flex flex-col backdrop-blur-xl bg-background/80`}
        style={{
          maxHeight: 'calc(100vh - env(safe-area-inset-top) - 4rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
          zIndex: 9999
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
                  <AvatarImage src={friend.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {friend.display_name?.[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <SheetTitle className="text-left text-sm">{friend.display_name}</SheetTitle>
                  <div className="text-xs text-muted-foreground">@{friend.username}</div>
                </div>
                {online
                  ? <span className="ml-2 text-xs text-green-400">● Online</span>
                  : lastSeenTs && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {dayjs(lastSeenTs).fromNow(true)}
                    </span>
                  )
                }
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
          {timeline.hasNextPage && (
            <Waypoint onEnter={() => timeline.fetchNextPage()}>
              <div className="flex justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </Waypoint>
          )}

          {timeline.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            (timeline.data?.pages.flatMap(p => p) ?? []).map((message) => {
              const isOwn = message.sender_id === currentUserId;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[70%] p-3 rounded-lg group",
                    isOwn
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted"
                  )}
                >
                  {message.metadata?.media ? (
                    <ChatMediaBubble 
                      media={message.metadata.media}
                      className="max-w-xs"
                    />
                  ) : (
                    <div className="text-sm">{message.content}</div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs opacity-70">
                      {dayjs(message.created_at).format('HH:mm')}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1 opacity-0 group-hover:opacity-100 transition h-6 w-6"
                      onClick={() => reactMut.mutate({ messageId: message.id, emoji: '👍' })}
                    >
                      👍
                    </Button>
                  </div>
                </div>
              );
            })
          )}
          {isTyping && (
            <div className="text-sm text-muted-foreground italic animate-pulse">
              {friend?.display_name} is typing...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/50 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <input
            type="file"
            accept="image/*,video/*"
            hidden
            ref={fileRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMut.mutate(file);
            }}
          />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileRef.current?.click()}
              className="shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-background/50 border-border/50"
              disabled={sendMut.isPending}
              aria-label="Direct message input"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sendMut.isPending}
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
});
