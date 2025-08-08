import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { DMQuickSheet } from '@/components/DMQuickSheet';
import { ThreadsList } from '@/components/messaging/ThreadsList';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface MessagesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFriendsSheetOpen?: () => void;
}

export const MessagesSheet = ({
  open,
  onOpenChange,
  onFriendsSheetOpen,
}: MessagesSheetProps) => {
  const { user } = useAuth();
  const [dmSheetOpen, setDmSheetOpen] = useState(false);
  const [selectedFriendProfileId, setSelectedFriendProfileId] = useState<string | undefined>(undefined);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(undefined);

  const handleThreadSelect = (threadId: string, friendProfileId: string) => {
    setSelectedFriendProfileId(friendProfileId);
    setSelectedThreadId(threadId); // ✅ Keep this! Prevent resolution loop
    setDmSheetOpen(true);
    // Don't close the list immediately - let user navigate back
  };

  // user.id is the profile_id (main user identifier)
  const currentProfileId = user?.id;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>Messages</SheetTitle>
            <VisuallyHidden asChild>
              <SheetDescription>Search and view your direct message conversations</SheetDescription>
            </VisuallyHidden>
          </SheetHeader>

          <div className="flex-1 overflow-hidden">
            {currentProfileId ? (
              <ThreadsList
                onThreadSelect={handleThreadSelect}
                currentProfileId={currentProfileId}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Please log in to view messages
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <DMQuickSheet
        open={dmSheetOpen}
        onOpenChange={setDmSheetOpen}
        friendId={selectedFriendProfileId}
        threadId={selectedThreadId} // ✅ Pass both IDs to prevent loop
      />
    </>
  );
};