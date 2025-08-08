import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { useThreads } from '@/hooks/messaging/useThreads';
import { useUnreadDMCounts } from '@/hooks/useUnreadDMCounts';
import { formatDistanceToNow } from 'date-fns';
import { Search, MessageCircle, User, Hash } from 'lucide-react';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ThreadsListProps {
  onThreadSelect: (threadId: string, friendProfileId: string) => void;
  currentProfileId: string; // profile_id is the main user identifier
}

// Helper to detect email-like usernames
const isEmailLike = (s?: string | null) => !!s && /.+@.+\..+/.test(s);

// Helper function to highlight search matches — now with keys on ALL children.
const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query || !text) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark
        key={`match-${index}`}
        className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5"
      >
        {part}
      </mark>
    ) : (
      <span key={`text-${index}`}>{part}</span>
    )
  );
};

// Local type for search results (shape mirrors your RPC output)
interface ThreadSearchResult {
  thread_id: string;
  friend_profile_id: string;
  friend_display_name: string;
  friend_username: string;
  friend_avatar_url: string;
  last_message_at: string | null;
  my_unread_count: number;
  last_message_content?: string;
  match_type: 'name' | 'username' | 'message';
  match_score: number;
}

// ---- Lazy profile hydration cache ----
type FriendProfileLite = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};
const friendProfileCache = new Map<string, FriendProfileLite>();

export const ThreadsList = ({ onThreadSelect, currentProfileId }: ThreadsListProps) => {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ThreadSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { threads: allThreads = [], isLoading: threadsLoading, searchThreads } = useThreads();
  const { data: unreadCounts = [] } = useUnreadDMCounts(currentProfileId);

  // Create unread counts lookup for better performance
  const unreadMap = useMemo(() => {
    const map = new Map<string, number>();
    unreadCounts.forEach((item) => map.set(item.thread_id, item.cnt));
    return map;
  }, [unreadCounts]);

  // Enhanced search using hook RPC with AbortController
  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const ctrl = new AbortController(); // Added AbortController
    
    const performSearch = async () => {
      setSearchLoading(true);
      try {
        const results = await searchThreads(debouncedSearch); // Note: removed signal for now as it may not be supported
        // results are ThreadSummary[]; normalize to ThreadSearchResult
        const normalized: ThreadSearchResult[] = (results || []).map((r: any) => {
          // Filter out email-like usernames
          const normHandle = !isEmailLike(r.friendProfile?.username ?? r.friend_username)
            ? (r.friendProfile?.username ?? r.friend_username ?? '')
            : '';

          return {
            thread_id: r.id ?? r.thread_id,
            friend_profile_id: r.friendProfile?.id ?? r.friend_profile_id ?? '',
            friend_display_name: 
              r.friendProfile?.display_name ?? 
              r.friend_display_name ?? 
              (normHandle || 'New User'),
            friend_username: normHandle,
            friend_avatar_url: r.friendProfile?.avatar_url ?? r.friend_avatar_url ?? '',
            last_message_at: r.lastMessageAt ?? r.last_message_at ?? null,
            my_unread_count: r.unreadCount ?? r.my_unread_count ?? 0,
            last_message_content: r.lastMessage?.content ?? r.last_message_content ?? '',
            match_type: r.match_type ?? 'name',
            match_score: r.match_score ?? 80,
          };
        });

        if (!ctrl.signal.aborted) { // Check if not aborted
          setSearchResults(normalized);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError' && !ctrl.signal.aborted) { // Ignore AbortError
          console.warn('Search failed (transient network issue):', e);
          setSearchResults([]);
        }
      } finally {
        if (!ctrl.signal.aborted) { // Only update if not aborted
          setSearchLoading(false);
        }
      }
    };

    performSearch();
    
    return () => {
      ctrl.abort(); // Abort on cleanup/re-run
    };
  }, [debouncedSearch, searchThreads]);

  // Build list when not searching - FIXED to use ThreadSummary structure with email filtering
  const mappedThreads: ThreadSearchResult[] = useMemo(() => {
    return allThreads.map((thread) => {
      // Choose safe name + handle, filtering out email-like usernames
      const displayName =
        thread.friendProfile?.display_name?.trim() ||
        (!isEmailLike(thread.friendProfile?.username) ? thread.friendProfile?.username?.trim() : '') ||
        'New User';

      const handle = !isEmailLike(thread.friendProfile?.username) ? thread.friendProfile?.username?.trim() || '' : '';

      return {
        thread_id: thread.id,
        friend_profile_id: thread.friendProfile?.id ?? '',
        friend_display_name: displayName,
        friend_username: handle, // <= no emails here
        friend_avatar_url: thread.friendProfile?.avatar_url ?? '',
        last_message_at: thread.lastMessageAt ?? null,
        my_unread_count: thread.unreadCount ?? 0,
        match_type: 'name' as const,
        match_score: 0,
      };
    });
  }, [allThreads]);

  // Pick which array to show, dedupe by thread_id to be safe
  const threadsToShow: ThreadSearchResult[] = useMemo(() => {
    const list = debouncedSearch ? searchResults : mappedThreads;
    const seen = new Set<string>();
    return list.filter((t) => {
      if (!t?.thread_id) return false;
      if (seen.has(t.thread_id)) return false;
      seen.add(t.thread_id);
      return true;
    });
  }, [debouncedSearch, searchResults, mappedThreads]);

  const handleThreadClick = (thread: ThreadSearchResult) => {
    if (!thread.thread_id) {
      console.warn('[ThreadsList] Missing thread_id in item, ignoring click');
      return;
    }
    if (!thread.friend_profile_id) {
      console.warn('[ThreadsList] Missing friend_profile_id for thread', thread.thread_id);
      return; // prevents DMQuickSheet from opening with undefined friendId
    }
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
        {debouncedSearch && threadsToShow.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Found {threadsToShow.length} result{threadsToShow.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {(searchLoading || threadsLoading) && (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        )}

        {threadsToShow.length === 0 && !searchLoading && !threadsLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {debouncedSearch ? 'No matches found' : 'No conversations yet'}
          </div>
        )}

        {threadsToShow.map((thread) => (
          <ThreadRow
            key={thread.thread_id} // stable key
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
  const [fallback, setFallback] = React.useState<FriendProfileLite | null>(null);

  // If we're missing names, hydrate from profiles
  React.useEffect(() => {
    const id = thread.friend_profile_id;
    const hasNames =
      Boolean(thread.friend_display_name) || Boolean(thread.friend_username);
    if (!id || hasNames) return;

    // cache first
    const cached = friendProfileCache.get(id);
    if (cached) {
      setFallback(cached);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('id', id)
        .maybeSingle();

      if (!cancelled && !error && data) {
        friendProfileCache.set(id, data);
        setFallback(data);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [thread.friend_profile_id, thread.friend_display_name, thread.friend_username]);

  // Clean display logic - no more email fallbacks + defensive email filter
  const displayName = thread.friend_display_name || 
                     (!isEmailLike(thread.friend_username) ? thread.friend_username : '') || 
                     'New User'; // ✅ FIX: Defensive client-only email filter
  const handle = thread.friend_username; // we already filtered emails out

  const avatarUrl = fallback?.avatar_url || thread.friend_avatar_url || undefined;
  const hasUnread = (thread.my_unread_count ?? 0) > 0;

  // Better avatar initials
  const initial = 
    (displayName && displayName[0]) ||
    (handle && handle[0]) || 'U';

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
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {initial.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3
              className={`font-medium truncate ${
                hasUnread ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {searchQuery ? highlightMatch(displayName, searchQuery) : displayName}
            </h3>
            {searchQuery && (thread.match_score ?? 0) > 0 && (
              <div className="flex items-center gap-1">{getMatchIcon()}</div>
            )}
          </div>
          {thread.last_message_at && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Show @handle always if present (not just during search) */}
        {handle && (
          <div className="text-xs text-muted-foreground mt-0.5">
            @{searchQuery ? highlightMatch(handle, searchQuery) : handle}
          </div>
        )}

        {searchQuery &&
          thread.match_type === 'message' &&
          thread.last_message_content && (
            <div className="text-xs text-muted-foreground mt-1 italic">
              "
              {highlightMatch(
                thread.last_message_content.substring(0, 50),
                searchQuery
              )}
              {thread.last_message_content.length > 50 ? '...' : '"'}
            </div>
          )}

        {hasUnread && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-muted-foreground">New messages</span>
            <Badge
              variant="default"
              className="h-5 min-w-[20px] flex items-center justify-center px-1.5"
            >
              {thread.my_unread_count}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};