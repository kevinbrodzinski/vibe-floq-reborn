import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FriendsTab } from '@/components/friends/FriendsTab';

interface FriendsSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  onAddFriendClick(): void;
}

export const FriendsSheet = ({
  open,
  onOpenChange,
  onAddFriendClick,
}: FriendsSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Friends & Discovery</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto">
          <FriendsTab />
        </div>
      </SheetContent>
    </Sheet>
  );
};