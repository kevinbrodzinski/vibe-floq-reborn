import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import React from 'react';
import { useMentionSearch } from '@/hooks/useMentionSearch';
import { getAvatarUrl } from '@/lib/avatar';

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

  if (!anchorRect || (!isFetching && data.length === 0)) return null;

  return (
    <Card
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
          {data.map((profile) => (
            <button
              key={profile.id}
              className={cn(
                'w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left'
              )}
              onClick={() => {
                onSelect(profile.username);
                onClose();
              }}
            >
              <AvatarWithFallback 
                src={profile.avatar_url ? getAvatarUrl(profile.avatar_url, 32) : null}
                fallbackText={profile.display_name}
                username={profile.username}
                className="w-8 h-8 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {profile.full_name || profile.display_name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  @{profile.username}
                </div>
              </div>
            </button>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};