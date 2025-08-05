import React from 'react';
import { Clock, Navigation, Calendar, UserPlus, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionBarProps {
  venue: {
    id?: string;
    lat: number;
    lng: number;
  };
  actions: {
    onCheckIn: (venueId: string) => void;
    onDirections: (venue: { lat: number; lng: number }) => void;
    onShare: (venueId: string) => void;
    onCreatePlan: (venueId: string) => void;
    onInviteFriends: (venueId: string) => void;
  };
  isInteracting: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({ venue, actions, isInteracting }) => {
  const venueId = venue.id || '';

  return (
    <>
      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => actions.onCheckIn(venueId)}
          disabled={isInteracting}
          className="h-12"
        >
          <Clock className="w-4 h-4 mr-2" />
          Check In
        </Button>
        <Button
          variant="secondary"
          onClick={() => actions.onDirections(venue)}
          className="h-12"
        >
          <Navigation className="w-4 h-4 mr-2" />
          Directions
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          variant="outline"
          onClick={() => actions.onCreatePlan(venueId)}
          className="h-10"
        >
          <Calendar className="w-4 h-4 mr-1" />
          Plan
        </Button>
        <Button
          variant="outline"
          onClick={() => actions.onInviteFriends(venueId)}
          className="h-10"
        >
          <UserPlus className="w-4 h-4 mr-1" />
          Invite
        </Button>
        <Button
          variant="outline"
          onClick={() => actions.onShare(venueId)}
          disabled={isInteracting}
          className="h-10"
        >
          <Share className="w-4 h-4 mr-1" />
          Share
        </Button>
      </div>
    </>
  );
};