
import React, { useState, useEffect, useRef, memo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Waypoint } from 'react-waypoint';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { useNearbyFriends } from '@/hooks/useNearbyFriends';
import { useLiveShareFriends } from '@/hooks/useLiveShareFriends';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { useToast } from '@/hooks/use-toast';
import { useMessages } from '@/hooks/messaging/useMessages';
import { useSendMessage } from '@/hooks/messaging/useSendMessage';
import { useMarkThreadRead } from '@/hooks/messaging/useMarkThreadRead';
import { useThreads } from '@/hooks/messaging/useThreads';
import { useAdvancedGestures } from '@/hooks/useAdvancedGestures';
import { useFriendsPresence } from '@/hooks/useFriendsPresence';
import { supabase } from '@/integrations/supabase/client';
import { rpc_markThreadRead, type Surface } from '@/lib/chat/api';
import isUuid from '@/lib/utils/isUuid';
import { cn } from '@/lib/utils';
import dayjs from '@/lib/dayjs';
import { MessageList } from '@/components/chat/MessageList';
import { getMediaURL } from '@/utils/mediaHelpers';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface DMQuickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendId: string | null;
}

export const DMQuickSheet = memo(({ open, onOpenChange, friendId }: DMQuickSheetProps) => {
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false); // Local sending state as fallback
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper to create stable thread ID - now generates proper UUID
  const threadIdFrom = async (userId: string, friendId: string) => {
    try {
      // Check if thread already exists
      const { data: existingThread } = await supabase
        .from('direct_threads')
        .select('id')
        .or(`and(member_a.eq.${userId},member_b.eq.${friendId}),and(member_a.eq.${friendId},member_b.eq.${userId})`)
        .maybeSingle();
      
      if (existingThread) {
        return existingThread.id;
      }
      
      // Create new thread
      const { data: newThread, error } = await supabase
        .from('direct_threads')
        .insert({
          member_a: userId,
          member_b: friendId,
          member_a_profile_id: userId,  // Required field
          member_b_profile_id: friendId,  // Required field
          last_message_at: new Date().toISOString(),
          unread_a: 0,
          unread_b: 0
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return newThread.id;
    } catch (error) {
      throw error;  // let the sheet show a toast instead
    }
  };

   // Unified messaging hooks - guard queries until thread is ready
   const enabled = threadId ? isUuid(threadId) : false;
   const messages = useMessages(threadId || '', 'dm');
   const sendMut = useSendMessage('dm');
  const markReadMut = useMarkThreadRead();
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<number | null>(null);

  // Debug logging for overlay management
  useEffect(() => {
    console.log('[DM_SHEET] Sheet state changed:', { open, friendId });
  }, [open, friendId]);

  // Debug mutation state
  useEffect(() => {
    console.log('[sendMut]', sendMut.status, sendMut.isPending, sendMut.data, sendMut.error);
  }, [sendMut.status]);

  // Swipe gesture for closing sheet
  const swipeGestures = useAdvancedGestures({
    onSwipeDown: () => onOpenChange(false)
  });

  // Get friend profile and presence
  const { data: friend, isLoading: friendLoading, error: friendError } = useProfile(friendId || undefined);
  const presence = useFriendsPresence()[friendId || ''];
  const online = presence?.status === 'online' && presence?.visible;
  const lastSeenTs = useLastSeen(friendId || '');

  // Get current user ID and setup thread
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  // Initialize thread when both user and friend are available
   useEffect(() => {
     if (currentUserId && friendId && open) {
       threadIdFrom(currentUserId, friendId)
         .then(setThreadId)
         .catch((error) => {
           console.error('Failed to create/get thread:', error);
           toast({
             title: "Could not start chat",
             description: "Please try again later.",
             variant: "destructive",
           });
         });
     } else {
       setThreadId(null);
     }
   }, [currentUserId, friendId, open, toast]);

  useEffect(() => {
    if (open && currentUserId && friendId && threadId) {
      markReadMut.mutate({ surface: 'dm', threadId });
      
      // Optimistically clear unread badge
      queryClient.setQueryData(
        ['dm-unread', currentUserId],
        (rows: any[]) => rows?.filter(r => r.thread_id !== threadId) ?? []
      );
    }
  }, [open, currentUserId, friendId, threadId, markReadMut, queryClient]);

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
    if (!input.trim() || sending) return;
    
    // Ensure we have a valid thread ID before sending
    if (!threadId) {
      toast({
        title: "Cannot send message",
        description: "Thread not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    console.log('[DMQuickSheet] Starting send with sending:', sending, 'isPending:', sendMut.isPending);
    
    // Use local sending state as fallback
    setSending(true);

    // Clear typing state immediately
    setIsTyping(false);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }

    try {
      console.log('[DMQuickSheet] Calling mutateAsync...');
      await sendMut.mutateAsync({ 
        threadId,
        content: input.trim()
      });
      console.log('[DMQuickSheet] mutateAsync completed successfully');
      setInput('');
      setReplyTo(null);
      
      // Note: sendMut already invalidates queries optimistically, but keeping for safety
      queryClient.invalidateQueries({ queryKey: ['dm-threads'] });
    } catch (error) {
      console.error('[DMQuickSheet] Send failed:', error);
      toast({
        title: "Message failed to send",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('[DMQuickSheet] Clearing sending state');
      setSending(false); // Always re-enable input
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
          <VisuallyHidden asChild>
            <SheetTitle>Direct message with {friend?.display_name ?? 'user'}</SheetTitle>
          </VisuallyHidden>
          
          <VisuallyHidden asChild>
            <SheetDescription>Conversation panel</SheetDescription>
          </VisuallyHidden>

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
                  <div className="text-left text-sm font-semibold">{friend.display_name}</div>
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
                <div className="flex-1">
                  <div className="text-left text-sm font-semibold">Direct Message</div>
                  <div className="text-xs text-muted-foreground">Chat privately with your friend</div>
                </div>
              </>
            )}
          </div>
        </SheetHeader>

        {/* Messages */}
        {enabled ? (
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            onReply={setReplyTo}
            className="flex-1"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Setting up chat...</p>
            </div>
          </div>
        )}
        
        {isTyping && (
          <div className="text-sm text-muted-foreground italic animate-pulse px-4">
            {friend?.display_name} is typing...
          </div>
        )}

        {/* Input with reply preview */}
        <div className="p-4 border-t border-border/50 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          {replyTo && (
            <div className="mb-2 bg-muted/30 p-2 rounded flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Replying to message
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(null)}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>
          )}
          <input
            type="file"
            accept="image/*,video/*"
            hidden
            ref={fileRef}
            disabled
          />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileRef.current?.click()}
              className="shrink-0"
              disabled
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-background/50 border-border/50"
              disabled={sending}
              aria-label="Direct message input"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sending}
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
