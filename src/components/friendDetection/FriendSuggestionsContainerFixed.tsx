import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Sparkles, 
  AlertCircle,
  Heart,
  Zap
} from 'lucide-react';
import { FriendSuggestionCard } from './FriendSuggestionCard';
import { useFriendDetection } from '@/hooks/useFriendDetection';
import { useAuth } from '@/hooks/useAuth';

interface FriendSuggestionsContainerProps {
  className?: string;
  lat?: number;
  lng?: number;
}

export function FriendSuggestionsContainer({ className = '', lat, lng }: FriendSuggestionsContainerProps) {
  const { session } = useAuth();
  const result = useFriendDetection(lat, lng, 500);
  
  const { data, isLoading, error } = result;
  
  if (!session?.user) return null;
  
  if (isLoading) {
    return (
      <div className={`bg-card rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Friend Suggestions</h3>
        </div>
        <div className="text-muted-foreground">Loading suggestions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-card rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <h3 className="text-lg font-semibold">Error</h3>
        </div>
        <div className="text-muted-foreground">Failed to load friend suggestions</div>
      </div>
    );
  }

  const nearbyFriends = data?.nearbyFriends ?? [];

  return (
    <div className={`bg-card rounded-xl p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Friend Suggestions</h3>
      </div>
      
      {nearbyFriends.length === 0 ? (
        <div className="text-center py-8">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No friend suggestions at the moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {nearbyFriends.map((friend) => (
            <FriendSuggestionCard 
              key={friend.id} 
              friend={friend}
              onConnect={() => {}}
              onDismiss={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}