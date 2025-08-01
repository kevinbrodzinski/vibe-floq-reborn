import React from 'react';
import { useFriendVibeMatches } from '@/hooks/useFriendVibeMatches';
import { EnhancedFriendCard } from '@/components/social/EnhancedFriendCard';

export const FriendAlignmentList: React.FC = () => {
  const { data } = useFriendVibeMatches();
  
  const handlePlan = (friendId: string) => {
    console.log(`Planning with friend: ${friendId}`);
    // TODO: Navigate to plan creation with friend pre-selected
  };

  const handlePing = (friendId: string) => {
    console.log(`Pinging friend: ${friendId}`);
    // TODO: Open DM thread or send quick ping
  };

  if (!data.length) return null;

  return (
    <div className="px-4 space-y-4">
      {data.map((friend) => (
        <EnhancedFriendCard
          key={friend.id}
          friend={friend}
          onPlan={handlePlan}
          onPing={handlePing}
        />
      ))}
    </div>
  );
};