
import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
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
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, UserPlus, Blocks, Flag, User, Loader2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUnreadDMCounts } from '@/hooks/useUnreadDMCounts';
import { useLastSeen } from '@/hooks/useLastSeen';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { useNearbyFriends } from '@/hooks/useNearbyFriends';
import { useLiveShareFriends } from '@/hooks/useLiveShareFriends';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { useToast } from '@/hooks/use-toast';
import { useMessages } from '@/hooks/messaging/useMessages';
import { sendMessageRPC } from '@/services/messages'; // ✅ Import direct RPC service
import { useTypingIndicators, useTypingIndicatorText } from '@/hooks/messaging/useTypingIndicators';
import { useAdvancedGestures } from '@/hooks/useAdvancedGestures';
import { useFriendsPresence } from '@/hooks/useFriendsPresence';
import { supabase } from '@/integrations/supabase/client';
import { rpc_markThreadRead, getOrCreateThread, type Surface } from '@/lib/chat/api';
import isUuid from '@/lib/utils/isUuid';
import { cn } from '@/lib/utils';
import dayjs from '@/lib/dayjs';
import { MessageList } from '@/components/chat/MessageList';
import { getMediaURL } from '@/utils/mediaHelpers';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface DMQuickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendId: string | null; // friend's profile_id
  threadId?: string; // optional threadId from parent (when available)
}

export const DMQuickSheet = memo(({ open, onOpenChange, friendId, threadId: threadIdProp }: DMQuickSheetProps) => {
  // Debug parent props
  console.log('[PARENT] DMQuickSheet props:', { open, friendId, threadIdProp });
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyPreview, setReplyPreview] = useState<{content?: string; authorId?: string} | null>(null);
  const [sending, setSending] = useState(false); // Local sending state as fallback
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null); // profile_id is the main user identifier
  const [threadId, setThreadId] = useState<string | undefined>(threadIdProp); // Local threadId state
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFriendRef = useRef<string | undefined>(undefined);
  const reqRef = useRef(0);
  const { user } = useAuth(); // Use auth context instead of one-off getUser()
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // ✅ Handle reply with input focus
  const handleReply = useCallback((id: string, preview?: {content?: string; authorId?: string}) => {
    setReplyTo(id); 
    setReplyPreview(preview ?? null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Stable thread lookup using RPC - getOrCreateThread is imported (stable)
   
  const threadIdFrom = useCallback(async (me: string, friend: string): Promise<string> => {
    return getOrCreateThread(me, friend);
  }, []);

  // Keep local state in sync if parent already knows the threadId
  useEffect(() => {
    if (threadIdProp) setThreadId(threadIdProp);
  }, [threadIdProp]);

  // Auth guard and unified messaging hooks - guard queries until thread is ready
  const isValidUuid = !!threadId && /^[0-9a-f-]{36}$/i.test(threadId);
  const enabled = Boolean(open && threadId && currentProfileId && isValidUuid);
  const messages = useMessages(isValidUuid ? threadId : undefined, 'dm', { enabled });
  // const sendMut = useSendMessage('dm'); // This line is no longer needed

  // Debug messages hook state
  useEffect(() => {
    console.log('[useMessages]', {
      threadId,
      isValidUuid,
      enabled,
      isLoading: messages.isLoading,
      isFetching: messages.isFetching,
      error: messages.error,
      count: messages.data?.pages?.reduce((sum, p) => sum + (p?.length || 0), 0) || 0,
      pages: messages.data?.pages?.length || 0
    });
  }, [
    threadId,
    isValidUuid,
    enabled,
    messages.isLoading,
    messages.isFetching,
    messages.error,
    messages.data
  ]);
  

  // Enhanced typing indicators - only subscribe with valid UUID
  const { typingUsers, handleTyping, handleMessageSent, hasTypingUsers } = useTypingIndicators(
    isValidUuid ? threadId : undefined, 
    'dm'
  );
  const typingText = useTypingIndicatorText(typingUsers);

  // Debug logging for overlay management
  useEffect(() => {
    console.log('[DM_SHEET] Sheet state changed:', { open, friendId });
  }, [open, friendId]);

  // Debug mutation state
  // useEffect(() => { // This block is no longer needed
  //   console.log('[sendMut]', sendMut.status, sendMut.isPending, sendMut.data, sendMut.error);
  // }, [sendMut.status]);

  // Debug IDs to see if threadId is being set properly
  useEffect(() => {
    console.log('[DM_SHEET] IDs:', {
      currentProfileId,
      friendId,
      threadId,
      threadIdProp,
      isValidUuid,
      enabled
    });
  }, [currentProfileId, friendId, threadId, threadIdProp, isValidUuid, enabled]);

  // Swipe gesture for closing sheet
  const swipeGestures = useAdvancedGestures({
    onSwipeDown: () => onOpenChange(false)
  });

  // Get friend profile and presence
  const { data: friend, isLoading: friendLoading, error: friendError } = useProfile(friendId || undefined);
  const presence = useFriendsPresence()[friendId || ''];
  const online = presence?.status === 'online' && presence?.visible;
  const lastSeenTs = useLastSeen(friendId || '');

  // Get current profile_id from auth context (user.id is the profile_id)
  useEffect(() => {
    const profileId = user?.id || null; // user.id is the profile_id (main user identifier)
    console.log('[DM_SHEET] Auth profile_id changed:', profileId);
    setCurrentProfileId(profileId);
  }, [user]);

  // Resolve by friendId only when we DON'T have a threadId - FIXED LOOP
  useEffect(() => {
    if (!open) return;
    if (!friendId) return;
    if (!currentProfileId) return;
    if (threadIdProp) return; // parent provided it
    if (lastFriendRef.current === friendId && threadId) return; // already resolved

    lastFriendRef.current = friendId;
    const reqId = ++reqRef.current;
    let aborted = false;

    console.log('[DM_SHEET] Resolving thread for:', { currentProfileId, friendId, reqId });

    (async () => {
      try {
        const resolvedThreadId = await threadIdFrom(currentProfileId, friendId);
        if (aborted || reqRef.current !== reqId) {
          console.log('[DM_SHEET] Ignoring stale thread resolution:', { reqId, current: reqRef.current });
          return; // ignore stale
        }
        console.log('[DM_SHEET] Thread resolved:', resolvedThreadId);
        setThreadId(resolvedThreadId);
      } catch (e: any) {
        if (aborted || reqRef.current !== reqId) return; // ignore stale
        
        console.error('[DM_SHEET] Thread error:', e);
        
        // Provide specific error messages based on the error
        let errorTitle = 'Chat error';
        let errorDescription = 'Could not start chat';
        
        if (e.message && e.message.includes('not friends')) {
          errorTitle = 'Cannot start conversation';
          errorDescription = 'You can only send direct messages to your friends. Send them a friend request first!';
        } else if (e.message && e.message.includes('yourself')) {
          errorTitle = 'Cannot message yourself';
          errorDescription = 'You cannot send direct messages to yourself.';
        } else if (e.message) {
          errorDescription = e.message;
        }
        
        toast({ 
          title: errorTitle, 
          description: errorDescription, 
          variant: 'destructive' 
        });
        setThreadId(undefined); // Keep undefined for retry, don't set to null
      }
    })();

    return () => { 
      aborted = true; 
    };
  }, [open, friendId, threadIdProp, currentProfileId, threadId, threadIdFrom, toast]);

  // IMPORTANT: Only clear threadId when friendId changes, NOT when sheet closes
  useEffect(() => {
    if (friendId !== lastFriendRef.current && lastFriendRef.current !== undefined) {
      setThreadId(undefined);
      lastFriendRef.current = undefined;
      reqRef.current = 0;
    }
  }, [friendId]);

  // Mark thread as read with proper auth guard
  useEffect(() => {
    if (open && currentProfileId && friendId && isValidUuid) {
      rpc_markThreadRead(threadId!, 'dm').catch(error => {
        console.error('Failed to mark thread as read:', error);
      });
    
      // Optimistically clear unread badge with proper typing
      queryClient.setQueryData<Array<{thread_id: string}>>(['dm-unread', currentProfileId], 
        (old) => old?.filter(r => r.thread_id !== threadId) ?? []
      );
    }
  }, [open, currentProfileId, friendId, threadId, isValidUuid, queryClient]);

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
    
    // Enhanced typing indicators - automatically handles debouncing and timeouts
    handleTyping();
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    if (!currentProfileId) {
      toast({ 
        title: "Authentication required", 
        description: "Please log in to send messages.", 
        variant: "destructive" 
      });
      return;
    }
    if (!isValidUuid || typeof threadId !== 'string') {
      toast({ 
        title: "Cannot send message", 
        description: "Thread not ready. Please try again.", 
        variant: "destructive" 
      });
      return;
    }

    // ✅ Validate replyTo is in the same thread (defense-in-depth)
    if (replyTo && !messages.data?.pages?.some(page => page?.some(m => m.id === replyTo))) {
      console.warn('[DMQuickSheet] replyTo is not in the loaded page set – still sending, server will validate');
    }

    console.log('[DMQuickSheet] Starting send with sending:', sending);
    
    setSending(true);
    handleMessageSent(); // Clear typing state immediately

    const tempId = `temp_${Date.now()}`;
    const messageContent = input.trim();
    
    // ✅ Optimistic UI update
    queryClient.setQueryData(['messages', 'dm', threadId], (old: any) => {
      if (!old) return old;
      
      const optimisticMessage = {
        id: tempId,
        thread_id: threadId,
        profile_id: currentProfileId, // ✅ FIX: Use profile_id to match database schema
        content: messageContent,
        created_at: new Date().toISOString(),
        metadata: { client_id: tempId },
        status: "sending",
        message_type: "text",
        reply_to: replyTo,
        reply_to_msg: null, // ✅ No parent data for optimistic message
        reactions: [], // ✅ No reactions yet for optimistic message
      };

      const pages = old.pages || [];
      const lastPage = pages[pages.length - 1] || [];
      
      return {
        ...old,
        pages: [...pages.slice(0, -1), [...lastPage, optimisticMessage]]
      };
    });

    try {
      console.log('[DMQuickSheet] Calling sendMessageRPC...');
      const newMessage = await sendMessageRPC({
        threadId,
        senderId: currentProfileId,
        body: messageContent,
        replyTo,
        media: null,
        type: 'text',
      });
      
      console.log('[DMQuickSheet] sendMessageRPC success, newMessage:', newMessage);
      
      // ✅ Replace optimistic message with real server data
      queryClient.setQueryData(['messages', 'dm', threadId], (old: any) => {
        if (!old) return old;
        
        const pages = old.pages || [];
        const updatedPages = pages.map((page: any[]) => 
          page.map(msg => msg.id === tempId ? newMessage : msg)
        );
        
        return {
          ...old,
          pages: updatedPages
        };
      });
      
      // Clear input/reply after success
      setInput('');
      setReplyTo(null);
      setReplyPreview(null);
      
      // ✅ Invalidate queries to refresh with server data
      queryClient.invalidateQueries({ queryKey: ['messages', 'dm', threadId] });
      queryClient.invalidateQueries({ queryKey: ['dm-threads'] });
      
      // ✅ Optimistically move thread to top for instant UI feedback
      queryClient.setQueryData(['dm-threads', currentProfileId], (old: any[] = []) => {
        return old
          .map(t => t.id === threadId ? { ...t, last_message_at: new Date().toISOString() } : t)
          .sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''));
      });
      
    } catch (error) {
      console.error('[DMQuickSheet] Send failed:', error);
      
      // ✅ Remove optimistic message on failure
      queryClient.setQueryData(['messages', 'dm', threadId], (old: any) => {
        if (!old) return old;
        
        const pages = old.pages || [];
        const updatedPages = pages.map((page: any[]) => 
          page.filter(msg => msg.id !== tempId)
        );
        
        return {
          ...old,
          pages: updatedPages
        };
      });
      
      toast({
        title: "Message failed to send",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('[DMQuickSheet] Clearing sending state');
      setSending(false);
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
            currentUserId={currentProfileId}
            threadId={threadId}
            onReply={handleReply}
            className="flex-1"
          />
        ) : threadId === undefined ? ( // Changed from null to undefined
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Cannot start conversation</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You can only send direct messages to your friends. 
                {friend && (
                  <>
                    <br />
                    <br />
                    Send <strong>{friend.display_name}</strong> a friend request to start chatting!
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Setting up chat...</p>
            </div>
          </div>
        )}
        
        {/* Enhanced Typing Indicators */}
        {hasTypingUsers && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
            </div>
            <span className="italic">{typingText}</span>
          </div>
        )}

        {/* Input with reply preview */}
        <div className="p-4 border-t border-border/50 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          {replyTo && (
            <div className="mb-2 bg-muted/20 p-3 rounded-lg border-l-2 border-primary/50">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-primary">
                  Replying to message
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { 
                    setReplyTo(null); 
                    setReplyPreview(null); 
                  }}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2 break-words">
                {replyPreview?.content || 'This message was deleted'}
              </div>
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
              disabled={true}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={
                threadId === undefined 
                  ? "Cannot send messages - not friends"
                  : "Type a message..."
              }
              className="flex-1 bg-background/50 border-border/50"
              disabled={sending || threadId === undefined}
              aria-label="Direct message input"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sending || threadId === undefined}
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
