
import { useState } from 'react';
import { MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useUnreadDMCounts } from '@/hooks/useUnreadDMCounts';
import { getAvatarUrl } from '@/lib/avatar';
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback';
import { useAvatarPreloader } from '@/hooks/useAvatarPreloader';
import { DMQuickSheet } from '@/components/DMQuickSheet';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface MessagesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFriendsSheetOpen?: () => void;
}

interface DMThread {
  id: string;
  member_a: string;
  member_b: string;
  last_message_at: string | null;
  last_message?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  other_user?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export const MessagesSheet = ({
  open,
  onOpenChange,
  onFriendsSheetOpen,
}: MessagesSheetProps) => {
  const { user } = useAuth();
  const { data: unreadCounts = [] } = useUnreadDMCounts(user?.id || null);
  const [dmSheetOpen, setDmSheetOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  /* ────────────────────────────────────────────
     Fetch threads + latest message with proper query
     ──────────────────────────────────────────── */
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['dm-threads', user?.id],
    enabled: !!user?.id && open,
    queryFn: async () => {
      console.log('📱 Fetching DM threads for user:', user!.id);
      
      // First, get all threads for this user
      const { data: threadsData, error: threadsError } = await supabase
        .from('direct_threads')
        .select(`
          id,
          member_a,
          member_b,
          last_message_at
        `)
        .or(`member_a.eq.${user!.id},member_b.eq.${user!.id}`)
        .order('last_message_at', { ascending: false })
        .limit(50);

      if (threadsError) {
        console.error('Error fetching threads:', threadsError);
        throw threadsError;
      }

      console.log('📱 Found threads:', threadsData?.length || 0);

      if (!threadsData || threadsData.length === 0) {
        return [];
      }

      // Get the other user IDs for profile lookup
      const otherUserIds = threadsData.map((t: any) =>
        t.member_a === user!.id ? t.member_b : t.member_a,
      );

      // Fetch profiles for other users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username')
        .in('id', otherUserIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Get thread IDs for latest message lookup
      const threadIds = threadsData.map(t => t.id);

      // Fetch latest messages for each thread
      const { data: allMessages, error: messagesError } = await supabase
        .from('direct_messages')
        .select('thread_id, content, sender_id, created_at')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
      }

      // Group messages by thread_id and get the latest for each
      const latestMessagesByThread = new Map();
      if (allMessages) {
        for (const msg of allMessages) {
          if (!latestMessagesByThread.has(msg.thread_id)) {
            latestMessagesByThread.set(msg.thread_id, msg);
          }
        }
      }

      // Combine threads with their latest messages and user profiles
      const enrichedThreads = threadsData.map((t: any) => {
        const otherId = t.member_a === user!.id ? t.member_b : t.member_a;
        const otherUser = profiles?.find((p: any) => p.id === otherId);
        const lastMessage = latestMessagesByThread.get(t.id);
        
        return {
          ...t,
          other_user: otherUser,
          last_message: lastMessage
        } as DMThread;
      });

      console.log('📱 Enriched threads:', enrichedThreads.length);
      return enrichedThreads;
    },
  });

  /* preload avatar images for smoother scroll */
  const avatarPaths = threads
    .map((t) => t.other_user?.avatar_url)
    .filter(Boolean);
  useAvatarPreloader(avatarPaths, [48]);

  const getUnreadCount = (threadId: string) => {
    const thread = unreadCounts.find(u => u.thread_id === threadId);
    return thread?.cnt || 0;
  };

  const totalUnread = unreadCounts.reduce(
    (sum, u) => sum + u.cnt,
    0,
  );

  const handleThreadClick = (thread: DMThread) => {
    const otherId = thread.member_a === user?.id
      ? thread.member_b
      : thread.member_a;
    setSelectedFriendId(otherId);
    setDmSheetOpen(true);
    onOpenChange(false); // close list sheet
  };

  /* ──────────────────────────────────────────────────────────────
     Return TWO siblings: message list sheet + DMQuickSheet
     ────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* List of threads */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
              {totalUnread > 0 && (
                <Badge variant="destructive">{totalUnread}</Badge>
              )}
            </SheetTitle>
            
            <VisuallyHidden asChild>
              <SheetDescription>This panel lists your direct-message threads.</SheetDescription>
            </VisuallyHidden>
          </SheetHeader>

          <div className="flex-1 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : threads.length > 0 ? (
              <div className="space-y-2">
                {threads.map((thread) => {
                  const unread = getUnreadCount(thread.id);
                  const last = thread.last_message;

                  return (
                    <Button
                      key={thread.id}
                      variant="ghost"
                      className="w-full h-auto p-4 justify-start hover:bg-accent/50"
                      onClick={() => handleThreadClick(thread)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <AvatarWithFallback
                          src={
                            thread.other_user?.avatar_url
                              ? getAvatarUrl(
                                  thread.other_user.avatar_url,
                                  48,
                                )
                              : null
                          }
                          fallbackText={
                            thread.other_user?.display_name ||
                            thread.other_user?.username ||
                            'U'
                          }
                          className="w-12 h-12 flex-shrink-0"
                        />

                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">
                              {thread.other_user?.display_name ||
                                thread.other_user?.username ||
                                'Unknown User'}
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {unread > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  {unread > 99 ? '99+' : unread}
                                </Badge>
                              )}
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>

                          {last && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {last.sender_id === user?.id ? 'You: ' : ''}
                              {last.content.length > 40
                                ? `${last.content.slice(0, 40)}…`
                                : last.content}
                            </p>
                          )}

                          {thread.last_message_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(
                                thread.last_message_at,
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No messages yet</p>
                <p className="text-sm mb-4">
                  Start a conversation with your friends
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onFriendsSheetOpen?.();
                  }}
                >
                  View Friends
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* DM composer sheet – separate/root-level */}
      <DMQuickSheet
        open={dmSheetOpen}
        onOpenChange={setDmSheetOpen}
        friendId={selectedFriendId}
      />
    </>
  );
};
