import { useState } from 'react';
import { MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
     Fetch threads + latest message in one query
     ──────────────────────────────────────────── */
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['dm-threads', user?.id],
    enabled: !!user?.id && open,
    queryFn: async () => {
      const { data: threadsData, error } = await supabase
        .from('direct_threads')
        .select(`
          id,
          member_a,
          member_b,
          last_message_at,
          last_message:v_latest_dm(content,sender_id,created_at)
        `)
        .or(`member_a.eq.${user!.id},member_b.eq.${user!.id}`)
        .order('last_message_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const otherUserIds =
        threadsData?.map((t: any) =>
          t.member_a === user!.id ? t.member_b : t.member_a,
        ) || [];

      if (otherUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username')
        .in('id', otherUserIds);

      return (
        threadsData?.map((t: any) => {
          const otherId =
            t.member_a === user!.id ? t.member_b : t.member_a;
          const otherUser = (profiles as any)?.find((p: any) => p.id === otherId);
          return { ...t, other_user: otherUser } as DMThread;
        }) || []
      );
    },
  });

  /* preload avatar images for smoother scroll */
  const avatarPaths = threads
    .map((t) => t.other_user?.avatar_url)
    .filter(Boolean);
  useAvatarPreloader(avatarPaths, [48]);

  const getUnreadCount = (threadId: string) =>
    unreadCounts.find((u) => u.thread_id === threadId)?.unread_count || 0;

  const totalUnread = unreadCounts.reduce(
    (sum, u) => sum + u.unread_count,
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