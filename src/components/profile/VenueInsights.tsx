import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Clock, TrendingUp } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface VenueInsight {
  venueId: string;
  venueName: string;
  visitCount: number;
  lastVisit: string;
  averageStayDuration: number;
  dominantVibe: string;
}

interface VenueInsightsProps {
  profileId: string;
  isOwnProfile?: boolean;
}

export const VenueInsights = ({ profileId, isOwnProfile = false }: VenueInsightsProps) => {
  const { data: venueInsights, isLoading } = useQuery({
    queryKey: ['venue-insights', profileId],
    queryFn: async (): Promise<VenueInsight[]> => {
      try {
        // Get venue check-ins with venue details
        const { data: venueData, error } = await supabase
          .from('venue_live_presence')
          .select(`
            venue_id,
            checked_in_at,
            venues!inner(name)
          `)
          .eq('profile_id', profileId as any)
          .order('checked_in_at', { ascending: false });

        if (error) {
          console.error('Error fetching venue data:', error);
          return [];
        }

        if (!venueData || (Array.isArray(venueData) && venueData.length === 0)) return [];

        const visits = Array.isArray(venueData) ? (venueData as any[]) : [];

        // Group by venue and calculate insights
        const venueMap = new Map<string, {
          name: string;
          visits: { checkedIn: string; checkedOut: string | null }[];
        }>();

        visits.forEach((visit: any) => {
          const venueId = visit.venue_id as string;
          const venueName = (visit.venues as any)?.name || 'Unknown Venue';
          
          if (!venueMap.has(venueId)) {
            venueMap.set(venueId, { name: venueName, visits: [] });
          }
          
          venueMap.get(venueId)!.visits.push({
            checkedIn: visit.checked_in_at as string,
            checkedOut: null // Set to null since checked_out_at column doesn't exist
          });
        });

        // Calculate insights for each venue
        const insights: VenueInsight[] = [];

        for (const [venueId, venueInfo] of venueMap) {
          const visits = venueInfo.visits;
          const visitCount = visits.length;
          
          // Calculate average stay duration
          const durations = visits
            .filter(v => v.checkedOut)
            .map(v => {
              const checkIn = new Date(v.checkedIn);
              const checkOut = new Date(v.checkedOut!);
              return checkOut.getTime() - checkIn.getTime();
            });
          
          const averageStayDuration = durations.length > 0 
            ? durations.reduce((sum, d) => sum + d, 0) / durations.length / (1000 * 60) // minutes
            : 0;

          const lastVisit = visits[0].checkedIn; // Already sorted by most recent

          insights.push({
            venueId,
            venueName: venueInfo.name,
            visitCount,
            lastVisit,
            averageStayDuration,
            dominantVibe: 'social' // TODO: Calculate from actual vibe data
          });
        }

        // Sort by visit count and return top 5
        return insights
          .sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, 5);
      } catch (error) {
        console.error('Error fetching venue insights:', error);
        return [];
      }
    },
    enabled: !!profileId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading || !venueInsights || venueInsights.length === 0) {
    return null;
  }

  const getVibeColor = (vibe: string) => {
    const colors = {
      social: 'text-orange-400',
      chill: 'text-blue-400',
      hype: 'text-pink-400',
      flowing: 'text-green-400',
      romantic: 'text-red-400',
    };
    return colors[vibe as keyof typeof colors] || 'text-gray-400';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  return (
    <GlassCard>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-300" />
          <h3 className="text-sm font-medium text-white">
            {isOwnProfile ? 'Most Visited Places' : 'Favorite Venues'}
          </h3>
        </div>

        <div className="space-y-3">
          {venueInsights.map((venue, index) => (
            <div 
              key={venue.venueId}
              className="flex items-center justify-between p-3 bg-black/20 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-purple-500/20 rounded-full text-xs text-purple-300">
                  {index + 1}
                </div>
                <div>
                  <div className="text-sm font-medium text-white truncate max-w-32">
                    {venue.venueName}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{venue.visitCount} visits</span>
                    <span>•</span>
                    <span>{getTimeAgo(venue.lastVisit)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                {venue.averageStayDuration > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(venue.averageStayDuration)}</span>
                  </div>
                )}
                <div className={`text-xs ${getVibeColor(venue.dominantVibe)}`}>
                  {venue.dominantVibe}
                </div>
              </div>
            </div>
          ))}
        </div>

        {isOwnProfile && (
          <div className="text-xs text-gray-500 text-center pt-2 border-t border-white/10">
            Based on your check-in history
          </div>
        )}
      </div>
    </GlassCard>
  );
};