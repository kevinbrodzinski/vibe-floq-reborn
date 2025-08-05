import React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NearbyPersonCard } from './NearbyPersonCard';
import { useFriendVibeMatches } from '@/hooks/useFriendVibeMatches';

interface NearbyPeopleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NearbyPeopleModal: React.FC<NearbyPeopleModalProps> = ({
  open,
  onOpenChange
}) => {
  const { data } = useFriendVibeMatches();
  
  const handlePlan = (friendId: string) => {
    console.log(`Planning with friend: ${friendId}`);
    // TODO: Navigate to plan creation with friend
  };

  const handlePing = (friendId: string) => {
    console.log(`Sending ping to friend: ${friendId}`);
    // TODO: Send ping notification
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="text-center pb-4">
          <SheetTitle className="text-xl">People Who Match Your Vibe</SheetTitle>
          <SheetDescription>
            AI-powered matches based on current energy and social patterns
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 -mx-3 sm:-mx-6">
          <div className="px-3 sm:px-6 space-y-4 sm:space-y-6 pb-6">
            {data.map((friend) => (
              <NearbyPersonCard
                key={friend.id}
                friend={friend}
                onPlan={handlePlan}
                onPing={handlePing}
              />
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};