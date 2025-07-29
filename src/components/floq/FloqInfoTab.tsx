import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Users, Calendar, Activity } from 'lucide-react';
import { formatTimeFromNow } from '@/lib/dateUtils';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { FloqDetails } from '@/hooks/useFloqDetails';

interface FloqInfoTabProps {
  floqDetails: FloqDetails;
}

export const FloqInfoTab: React.FC<FloqInfoTabProps> = ({ floqDetails }) => {
  const exploreBeta = useFeatureFlag('EXPLORE');
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Basic Info */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Floq Details
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Title</label>
            <p className="text-lg font-medium">{floqDetails.title}</p>
          </div>
          
          {floqDetails.description && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-sm">{floqDetails.description}</p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Vibe</label>
            <div className="mt-1">
              <Badge variant="secondary">{floqDetails.primary_vibe}</Badge>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Visibility</label>
            <p className="text-sm capitalize">{floqDetails.visibility}</p>
          </div>
        </div>
      </Card>

      {/* Timing & Location */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Schedule & Location
        </h3>
        
        <div className="space-y-4">
          {floqDetails.starts_at && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Starts {formatTimeFromNow(floqDetails.starts_at)}</span>
            </div>
          )}
          
          {floqDetails.ends_at && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Ends {formatTimeFromNow(floqDetails.ends_at)}</span>
            </div>
          )}
          
          {exploreBeta && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2 text-sm h-auto p-0 justify-start text-muted-foreground hover:text-foreground"
              onClick={() => {
                // Map view feature coming soon
                console.log('Map view feature coming soon');
              }}
            >
              <MapPin className="h-4 w-4" />
              <span>📍 View on map</span>
            </Button>
          )}
          
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{floqDetails.participant_count} participants</span>
          </div>
        </div>
      </Card>

      {/* Participants */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Participants
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {floqDetails.participants?.map((participant) => (
            <div
              key={participant.profile_id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
            >
              {participant.avatar_url ? (
                <img
                  src={participant.avatar_url}
                  alt={participant.display_name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {participant.display_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{participant.username}
                </p>
              </div>
              {participant.role && participant.role !== 'member' && (
                <Badge variant="outline" className="text-xs">
                  {participant.role}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};