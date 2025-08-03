import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchThreads, type ThreadSearchResult } from '@/hooks/useSearchThreads';
import { useThreads } from '@/hooks/messaging/useThreads';
import { useUnreadDMCounts } from '@/hooks/useUnreadDMCounts';
import { formatDistanceToNow } from 'date-fns';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ThreadsListProps {
  onThreadSelect: (threadId: string, friendId: string) => void;
  currentUserId: string;
}

export const ThreadsList = ({ onThreadSelect, currentUserId }: ThreadsListProps) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  
  const { data: allThreads = [], isLoading: threadsLoading } = useThreads();
  const { data: searchResults = [], isFetching: searchLoading } = useSearchThreads(debouncedSearch);
  const { data: unreadCounts = [] } = useUnreadDMCounts(currentUserId);

  const threadsToShow = debouncedSearch ? searchResults : 
    allThreads.map(thread => {
      const isUserA = thread.member_a === currentUserId;
      return {
        thread_id: thread.id,
        friend_profile_id: isUserA ? thread.member_b_profile_id : thread.member_a_profile_id,
        friend_display_name: '', // Will be loaded when needed
        friend_username: '',
        friend_avatar_url: '',
        last_message_at: thread.last_message_at,
        my_unread_count: unreadCounts.find(u => u.thread_id === thread.id)?.cnt || 0
      } as ThreadSearchResult;
    });

  const handleThreadClick = (thread: ThreadSearchResult) => {
    onThreadSelect(thread.thread_id, thread.friend_profile_id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="pl-10 bg-background/60"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {(searchLoading || threadsLoading) && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        )}

        {threadsToShow.length === 0 && !searchLoading && !threadsLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {debouncedSearch ? 'No matches found' : 'No conversations yet'}
          </div>
        )}

        {threadsToShow.map((thread) => (
          <ThreadRow
            key={thread.thread_id}
            thread={thread}
            onClick={() => handleThreadClick(thread)}
          />
        ))}
      </ScrollArea>
    </div>
  );
};

interface ThreadRowProps {
  thread: ThreadSearchResult;
  onClick: () => void;
}

const ThreadRow = ({ thread, onClick }: ThreadRowProps) => {
  const displayName = thread.friend_display_name || thread.friend_username || 'Unknown';
  const hasUnread = thread.my_unread_count > 0;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer border-b border-border/50"
    >
      <Avatar className="w-10 h-10">
        <AvatarImage src={thread.friend_avatar_url} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className={`font-medium truncate ${hasUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
            {displayName}
          </h3>
          {thread.last_message_at && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
            </span>
          )}
        </div>
        {hasUnread && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-muted-foreground">New messages</span>
            <Badge variant="default" className="h-5 min-w-[20px] flex items-center justify-center px-1.5">
              {thread.my_unread_count}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};