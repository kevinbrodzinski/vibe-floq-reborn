import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchThreads, type ThreadSearchResult } from '@/hooks/useSearchThreads';
import { useThreads, type DirectThreadWithProfiles } from '@/hooks/messaging/useThreads';
import { useUnreadDMCounts } from '@/hooks/useUnreadDMCounts';
import { formatDistanceToNow } from 'date-fns';
import { Search, MessageCircle, User, Hash } from 'lucide-react';
import { useMemo } from 'react';

interface ThreadsListProps {
  onThreadSelect: (threadId: string, friendId: string) => void;
  currentUserId: string;
}

// Helper function to highlight search matches
const highlightMatch = (text: string, query: string) => {
  if (!query || !text) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
        {part}
      </mark>
    ) : part
  );
};

export const ThreadsList = ({ onThreadSelect, currentUserId }: ThreadsListProps) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  
  const { data: allThreads = [], isLoading: threadsLoading } = useThreads();
  const { data: searchResults = [], isFetching: searchLoading } = useSearchThreads(debouncedSearch);
  const { data: unreadCounts = [] } = useUnreadDMCounts(currentUserId);

  // Create unread counts lookup for better performance
  const unreadMap = useMemo(() => {
    const map = new Map<string, number>();
    unreadCounts.forEach(item => map.set(item.thread_id, item.cnt));
    return map;
  }, [unreadCounts]);

  const threadsToShow = debouncedSearch ? searchResults : 
    allThreads.map(thread => {
      const isUserA = thread.member_a === currentUserId;
      const friendProfile = isUserA ? thread.member_b_profile : thread.member_a_profile;
      
      return {
        thread_id: thread.id,
        friend_profile_id: isUserA ? thread.member_b_profile_id : thread.member_a_profile_id,
        friend_display_name: friendProfile?.display_name || '',
        friend_username: friendProfile?.username || '',
        friend_avatar_url: friendProfile?.avatar_url || '',
        last_message_at: thread.last_message_at,
        my_unread_count: unreadMap.get(thread.id) || 0,
        match_type: 'name' as const,
        match_score: 0
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
        {debouncedSearch && searchResults.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </div>
        )}
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
            searchQuery={debouncedSearch}
            onClick={() => handleThreadClick(thread)}
          />
        ))}
      </ScrollArea>
    </div>
  );
};

interface ThreadRowProps {
  thread: ThreadSearchResult;
  searchQuery: string;
  onClick: () => void;
}

const ThreadRow = ({ thread, searchQuery, onClick }: ThreadRowProps) => {
  const displayName = thread.friend_display_name || thread.friend_username || 'Unknown User';
  const hasUnread = thread.my_unread_count > 0;

  // Get match type icon
  const getMatchIcon = () => {
    switch (thread.match_type) {
      case 'username':
        return <Hash className="w-3 h-3 text-blue-500" />;
      case 'message':
        return <MessageCircle className="w-3 h-3 text-green-500" />;
      default:
        return <User className="w-3 h-3 text-gray-500" />;
    }
  };

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
          <div className="flex items-center gap-2">
            <h3 className={`font-medium truncate ${hasUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
              {searchQuery ? highlightMatch(displayName, searchQuery) : displayName}
            </h3>
            {searchQuery && thread.match_score > 0 && (
              <div className="flex items-center gap-1">
                {getMatchIcon()}
              </div>
            )}
          </div>
          {thread.last_message_at && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
            </span>
          )}
        </div>
        
        {/* Show username if searching and it's different from display name */}
        {searchQuery && thread.friend_username && thread.friend_username !== thread.friend_display_name && (
          <div className="text-xs text-muted-foreground mt-0.5">
            @{highlightMatch(thread.friend_username, searchQuery)}
          </div>
        )}
        
        {/* Show matching message content if found */}
        {searchQuery && thread.match_type === 'message' && thread.last_message_content && (
          <div className="text-xs text-muted-foreground mt-1 italic">
            "{highlightMatch(thread.last_message_content.substring(0, 50), searchQuery)}
            {thread.last_message_content.length > 50 ? '...' : '"'}
          </div>
        )}
        
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