import { useState, useEffect } from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
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
import { Loader2 } from 'lucide-react';
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
  last_message_at: string;
  last_message?: {
    content: string;
    sender_id: string;
  };
  other_user?: {
    id: string;
    display_name: string;
    avatar_url: string;
    username: string;
  };
}

export const MessagesSheet = ({ open, onOpenChange, onFriendsSheetOpen }: MessagesSheetProps) => {
  const { user } = useAuth();
  const { data: unreadCounts = [] } = useUnreadDMCounts(user?.id || null);
  const [dmSheetOpen, setDmSheetOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  // Get all DM threads for the current user
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['dm-threads', user?.id],
    enabled: !!user?.id && open,
    queryFn: async () => {
      // Get threads where user is either member_a or member_b
      const { data: threadsData, error } = await supabase
        .from('direct_threads')
        .select(`
          id,
          member_a,
          member_b,
          last_message_at,
          last_message:direct_messages(content, sender_id)
        `)
        .or(`member_a.eq.${user!.id},member_b.eq.${user!.id}`)
        .order('last_message_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get profile info for other users in each thread
      const otherUserIds = threadsData?.map((thread: any) => 
        thread.member_a === user!.id ? thread.member_b : thread.member_a
      ) || [];

      if (otherUserIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username')
        .in('id', otherUserIds);

      if (profilesError) throw profilesError;

      // Combine threads with profile data
      const threadsWithProfiles = threadsData?.map((thread: any) => {
        const otherUserId = thread.member_a === user!.id ? thread.member_b : thread.member_a;
        const otherUser = (profiles as any)?.find((p: any) => p.id === otherUserId);
        
        return {
          ...thread,
          other_user: otherUser,
          last_message: Array.isArray(thread.last_message) 
            ? thread.last_message[0] 
            : thread.last_message
        };
      }) || [];

      return threadsWithProfiles;
    },
  });

  // Preload avatars for better performance
  const avatarPaths = threads.map(thread => thread.other_user?.avatar_url).filter(Boolean);
  useAvatarPreloader(avatarPaths, [48]);

  const handleThreadClick = (thread: DMThread) => {
    const otherUserId = thread.member_a === user?.id ? thread.member_b : thread.member_a;
    setSelectedFriendId(otherUserId);
    setDmSheetOpen(true);
    onOpenChange(false);
  };

  const getUnreadCount = (threadId: string) => {
    return unreadCounts.find(uc => uc.thread_id === threadId)?.unread_count || 0;
  };

  const totalUnread = unreadCounts.reduce((sum, uc) => sum + uc.unread_count, 0);

  return (
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
                const unreadCount = getUnreadCount(thread.id);
                const lastMessage = thread.last_message;
                
                return (
                  <Button
                    key={thread.id}
                    variant="ghost"
                    className="w-full h-auto p-4 justify-start hover:bg-accent/50"
                    onClick={() => handleThreadClick(thread)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <AvatarWithFallback 
                        src={thread.other_user?.avatar_url ? getAvatarUrl(thread.other_user.avatar_url, 48) : null}
                        fallbackText={thread.other_user?.display_name || thread.other_user?.username || 'U'}
                        className="w-12 h-12 flex-shrink-0"
                      />
                      
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">
                            {thread.other_user?.display_name || thread.other_user?.username || 'Unknown User'}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </Badge>
                            )}
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        
                        {lastMessage && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {lastMessage.sender_id === user?.id ? 'You: ' : ''}
                            {lastMessage.content.length > 40 ? 
                              `${lastMessage.content.substring(0, 40)}...` : 
                              lastMessage.content
                            }
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(thread.last_message_at).toLocaleDateString()}
                        </p>
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
              <p className="text-sm mb-4">Start a conversation with your friends</p>
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
      
      <DMQuickSheet 
        open={dmSheetOpen} 
        onOpenChange={setDmSheetOpen}
        friendId={selectedFriendId}
      />
    </Sheet>
  );
};