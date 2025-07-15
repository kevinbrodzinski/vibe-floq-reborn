import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';
import { useMentionSearch } from '@/hooks/useMentionSearch';
import { getAvatarUrl } from '@/lib/avatar';
import { useUserPresence } from '@/hooks/useUserPresence';
import { Loader2 } from 'lucide-react';

interface MentionDropdownProps {
  anchorRect: DOMRect | null;     // caret position (converted → viewport)
  query: string;                  // partial handle without "@"
  onSelect: (handle: string) => void;
  onClose: () => void;
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  anchorRect,
  query,
  onSelect,
  onClose,
}) => {
  const { data = [], isFetching } = useMentionSearch(query);
  const { isUserOnline } = useUserPresence();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [data]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % data.length);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + data.length) % data.length);
    }
    if (e.key === 'Enter' && data[selectedIndex]) {
      e.preventDefault();
      onSelect(data[selectedIndex].username);
      onClose();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!anchorRect || (!isFetching && data.length === 0)) return null;

  return (
    <Card
      ref={cardRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label="User mention suggestions"
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 4,
        left: anchorRect.left,
        zIndex: 80,
        width: 260,
        maxHeight: 240,
      }}
      className="shadow-lg bg-background border"
    >
      <ScrollArea className="h-full w-full">
        <CardContent className="p-0 divide-y divide-border">
          {isFetching && data.length === 0 ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : (
            data.map((profile, index) => (
            <button
              key={profile.id}
              className={cn(
                'w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left',
                selectedIndex === index && 'bg-muted/50'
              )}
              onClick={() => {
                onSelect(profile.username);
                onClose();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                onSelect(profile.username);
                onClose();
              }}
              aria-label={`Mention ${profile.display_name} (@${profile.username})`}
              role="option"
              aria-selected={selectedIndex === index}
            >
              <div className="relative">
                <AvatarWithFallback 
                  src={profile.avatar_url ? getAvatarUrl(profile.avatar_url, 32) : null}
                  fallbackText={profile.display_name}
                  username={profile.username}
                  className="w-8 h-8 flex-shrink-0"
                />
                {/* Online status indicator */}
                {isUserOnline(profile.id) && (
                  <div 
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"
                    aria-label="Online"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {profile.full_name || profile.display_name}
                  {isUserOnline(profile.id) && (
                    <span className="text-xs text-green-600 ml-1">(online)</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  @{profile.username}
                </div>
              </div>
            </button>
            ))
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};