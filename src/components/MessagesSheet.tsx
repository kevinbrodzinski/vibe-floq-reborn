import { useState } from 'react';
import {
  MessageSquare,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  /* ⬇ portal helper re-exported by your shadcn/tamagui wrapper */
  SheetPortal,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useUnreadDMCounts } from '@/hooks/useUnreadDMCounts';
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback';
import { getAvatarUrl } from '@/lib/avatar';
import { useAvatarPreloader } from '@/hooks/useAvatarPreloader';
import { DMQuickSheet } from '@/components/DMQuickSheet';

interface MessagesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFriendsSheetOpen?: () => void;
}

/* view-backed shape */
interface DMThread {
  id: string;
  member_a: string;
  member_b: string;
  last_message_at: string | null;
  last_message: {
    content: string;
    sender_id: string;
    created_at: string;
  } | null;
  other_user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

export const MessagesSheet = ({
  open,
  onOpenChange,
  onFriendsSheetOpen,
}: MessagesSheetProps) => {
  const { user } = useAuth();
  const [dmOpen, setDmOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);

  /* unread counts ----------------------------------------------------- */
  const { data: unread = [] } = useUnreadDMCounts(user?.id ?? null);
  const totalUnread = unread.reduce((sum, u) => sum + u.unread_count, 0);
  const unreadFor = (threadId: string) =>
    unread.find((u) => u.thread_id === threadId)?.unread_count ?? 0;

  /* threads query ------------------------------------------------------ */
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['dm-threads', user?.id],
    enabled: !!user?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
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
      if (!data?.length) return [];

      /* stitch profile info in one extra round-trip */
      const otherIds = data.map((t) =>
        t.member_a === user!.id ? t.member_b : t.member_a,
      );
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username')
        .in('id', otherIds);

      return data.map((t) => {
        const otherId = t.member_a === user!.id ? t.member_b : t.member_a;
        return {
          ...t,
          other_user: profiles?.find((p) => p.id === otherId) ?? null,
        } as DMThread;
      });
    },
  });

  /* avatar preload ---------------------------------------------------- */
  useAvatarPreloader(
    threads
      .map((t) => t.other_user?.avatar_url)
      .filter(Boolean) as string[],
    [48],
  );

  /* handlers ----------------------------------------------------------- */
  const openDM = (t: DMThread) => {
    const other =
      t.member_a === user?.id ? t.member_b : t.member_a;
    setTargetId(other);
    setDmOpen(true);
    onOpenChange(false); // hide list sheet
  };

  /* ------------------------------------------------------------------ */
  return (
    <>
      {/* thread list sheet */}
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
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : threads.length ? (
              <div className="space-y-2">
                {threads.map((t) => {
                  const unreadCount = unreadFor(t.id);
                  return (
                    <Button
                      key={t.id}
                      variant="ghost"
                      className="w-full h-auto p-4 justify-start"
                      onClick={() => openDM(t)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <AvatarWithFallback
                          src={
                            t.other_user?.avatar_url
                              ? getAvatarUrl(
                                  t.other_user.avatar_url,
                                  48,
                                )
                              : null
                          }
                          fallbackText={
                            t.other_user?.display_name ??
                            t.other_user?.username ??
                            'U'
                          }
                          className="w-12 h-12 shrink-0"
                        />

                        <div className="flex-1 min-w-0 text-left">
                          {/* name + badge */}
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">
                              {t.other_user?.display_name ??
                                t.other_user?.username ??
                                'Unknown'}
                            </p>
                            <div className="flex items-center gap-2">
                              {unreadCount > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  {unreadCount > 99
                                    ? '99+'
                                    : unreadCount}
                                </Badge>
                              )}
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>

                          {/* last message */}
                          {t.last_message && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {t.last_message.sender_id === user?.id
                                ? 'You: '
                                : ''}
                              {t.last_message.content.length > 40
                                ? t.last_message.content.slice(0, 40) + '…'
                                : t.last_message.content}
                            </p>
                          )}

                          {/* timestamp */}
                          {t.last_message_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(
                                t.last_message_at,
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

      {/* DM composer sheet rendered in root portal with high zIndex */}
      <SheetPortal>
        <DMQuickSheet
          open={dmOpen}
          onOpenChange={setDmOpen}
          friendId={targetId}
          sheetProps={{ zIndex: 10000 }} /* guarantee above overlay */
        />
      </SheetPortal>
    </>
  );
};