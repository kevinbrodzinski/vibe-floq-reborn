import React from 'react';
import { EnhancedRecommendationCard } from './EnhancedRecommendationCard';
import { Sparkles } from 'lucide-react';
import { useRecommendationActions } from '@/hooks/useRecommendationActions';

// Sample data matching the screenshot
const sampleRecommendations = [
  {
    id: '1',
    title: 'Venice Beach Boardwalk',
    type: 'venue' as const,
    distance: 300,
    vibe: 'mixed',
    status: 'open' as const,
    description: 'Iconic beachfront promenade with street performers, artists, and ocean views',
    location: 'Venice Beach, CA',
    price: 'Free',
    rating: 4.5,
    venueType: 'outdoor',
    tags: ['beach', 'tourist', 'artistic'],
    isFavorite: false
  },
  {
    id: '2',
    title: 'Morning Run Club',
    type: 'floq' as const,
    distance: 1000,
    vibe: 'social',
    participants: 15,
    maxParticipants: 20,
    status: 'upcoming' as const,
    description: 'Daily morning runs along the beach with fellow fitness enthusiasts',
    location: 'Santa Monica Beach',
    startTime: '2024-01-15T07:00:00Z',
    endTime: '2024-01-15T08:30:00Z',
    host: {
      name: 'Sarah Chen',
      avatar: '/avatars/sarah.jpg'
    },
    spotsLeft: 5,
    tags: ['fitness', 'morning', 'beach'],
    isFavorite: false,
    isWatching: false
  },
  {
    id: '3',
    title: 'Meditation Circle',
    type: 'floq' as const,
    distance: 400,
    vibe: 'chill',
    participants: 9,
    maxParticipants: 12,
    status: 'invite_only' as const,
    description: 'Peaceful meditation sessions in a serene garden setting',
    location: 'Venice Canals',
    startTime: '2024-01-15T18:00:00Z',
    endTime: '2024-01-15T19:00:00Z',
    host: {
      name: 'Michael Zen',
      avatar: '/avatars/michael.jpg'
    },
    spotsLeft: 3,
    tags: ['wellness', 'meditation', 'peaceful'],
    isFavorite: false,
    isWatching: false
  },
  {
    id: '4',
    title: 'Tech Meetup',
    type: 'floq' as const,
    distance: 800,
    vibe: 'curious',
    participants: 32,
    maxParticipants: 50,
    status: 'active' as const,
    description: 'Weekly tech discussions and networking for developers and entrepreneurs',
    location: 'Silicon Beach Hub',
    startTime: '2024-01-15T19:00:00Z',
    endTime: '2024-01-15T21:00:00Z',
    host: {
      name: 'Alex Tech',
      avatar: '/avatars/alex.jpg'
    },
    spotsLeft: 18,
    tags: ['technology', 'networking', 'startup'],
    isFavorite: false,
    isWatching: false
  }
];

export const RecommendationsDemo: React.FC = () => {
  const { handleAction, getActionHistory, clearActionHistory } = useRecommendationActions();
  
  const handleItemAction = (action: string, itemId: string) => {
    const item = sampleRecommendations.find(rec => rec.id === itemId);
    handleAction(action, itemId, item);
  };

  return (
    <div className="min-h-screen bg-gradient-field p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Recommended for you
          </h1>
        </div>

        {/* Recommendations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sampleRecommendations.map((item) => (
            <EnhancedRecommendationCard
              key={item.id}
              item={item}
              onAction={handleItemAction}
            />
          ))}
        </div>

        {/* Action Log */}
        <div className="mt-8 p-4 bg-card/20 rounded-lg border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground">Action Log</h3>
            <button 
              onClick={clearActionHistory}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {getActionHistory().slice(-5).map((action, index) => (
              <div key={index} className="text-xs text-muted-foreground">
                {action.action} on item {action.id} at {action.timestamp.toLocaleTimeString()}
              </div>
            ))}
            {getActionHistory().length === 0 && (
              <p className="text-xs text-muted-foreground">No actions yet. Try interacting with the cards above!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 