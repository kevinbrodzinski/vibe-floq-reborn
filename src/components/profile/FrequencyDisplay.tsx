import { MapPin, Calendar, Users } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { useFrequencyData } from '@/hooks/useFrequencyData';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface FrequencyDisplayProps {
  userId: string;
  className?: string;
}

export const FrequencyDisplay = ({ userId, className }: FrequencyDisplayProps) => {
  const { data: frequencyData, isLoading } = useFrequencyData(userId);

  if (isLoading) {
    return (
      <GlassCard className={className}>
        <h3 className="text-white text-sm font-medium mb-3">Frequent Places & Activities</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </GlassCard>
    );
  }

  const hasData = frequencyData && (
    frequencyData.venues.length > 0 || 
    frequencyData.activities.length > 0 || 
    frequencyData.locations.length > 0
  );

  if (!hasData) {
    return (
      <GlassCard className={className}>
        <h3 className="text-white text-sm font-medium mb-3">Frequent Places & Activities</h3>
        <p className="text-gray-400 text-xs text-center py-4">
          No frequent places or activities yet
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={className}>
      <h3 className="text-white text-sm font-medium mb-3">Frequent Places & Activities</h3>
      
      <div className="space-y-3">
        {/* Top Venues */}
        {frequencyData.venues.length > 0 && (
          <div>
            <h4 className="text-gray-300 text-xs font-medium mb-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Venues
            </h4>
            <div className="space-y-1">
              {frequencyData.venues.slice(0, 3).map((venue) => (
                <div key={venue.venue_id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{venue.name}</p>
                    <p className="text-gray-400 text-xs">
                      {venue.visit_count} visit{venue.visit_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-gray-500 text-xs">
                    {formatDistanceToNow(new Date(venue.last_visit), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Activities */}
        {frequencyData.activities.length > 0 && (
          <div>
            <h4 className="text-gray-300 text-xs font-medium mb-2 flex items-center gap-1">
              <Users className="h-3 w-3" />
              Activities
            </h4>
            <div className="space-y-1">
              {frequencyData.activities.slice(0, 3).map((activity) => (
                <div key={activity.floq_id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{activity.title}</p>
                    <p className="text-gray-400 text-xs">
                      {activity.participation_count} time{activity.participation_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-gray-500 text-xs">
                    {formatDistanceToNow(new Date(activity.last_participated), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Locations */}
        {frequencyData.locations.length > 0 && (
          <div>
            <h4 className="text-gray-300 text-xs font-medium mb-2 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Locations
            </h4>
            <div className="space-y-1">
              {frequencyData.locations.slice(0, 3).map((location, index) => (
                <div key={`${location.location_name}-${index}`} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{location.location_name}</p>
                    <p className="text-gray-400 text-xs">
                      {location.visit_count} visit{location.visit_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-gray-500 text-xs">
                    {formatDistanceToNow(new Date(location.last_visit), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};