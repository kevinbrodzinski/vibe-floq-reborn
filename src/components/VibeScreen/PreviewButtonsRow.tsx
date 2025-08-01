import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Utensils, Users, TrendingUp, Waves, Circle } from 'lucide-react';
import { useVibeClusterStats } from '@/hooks/useVibeClusterStats';
import { useVenueRecommendations } from '@/hooks/useVenueRecommendations';
import { useNearbyFloqsPreview } from '@/hooks/useNearbyFloqsPreview';
import { cn } from '@/lib/utils';

interface PreviewButtonsRowProps {
  onMapPress: () => void;
  onVenuesPress: () => void;
  onFloqsPress: () => void;
  className?: string;
}

export const PreviewButtonsRow: React.FC<PreviewButtonsRowProps> = ({
  onMapPress,
  onVenuesPress,
  onFloqsPress,
  className
}) => {
  const { clusterCount, personCount } = useVibeClusterStats();
  const { data: venues } = useVenueRecommendations();
  const { count: floqCount, closestDistance, activeNow, topVibe } = useNearbyFloqsPreview();
  
  const topVenue = venues[0];
  const venueCount = venues.length;

  return (
    <div className={cn('px-4 space-y-4', className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Vibe Clusters Preview */}
        <motion.div
          layout
          initial={{ opacity: 0, translateX: -20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card 
            className="h-full cursor-pointer hover:scale-[1.02] transition-all duration-200 hover:shadow-lg border-2 hover:border-primary/20"
            onClick={onMapPress}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Vibe Clusters Nearby</h3>
                  <p className="text-xs text-muted-foreground">Live density map</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Active now</span>
                  <Badge variant="outline" className="text-xs">
                    LIVE
                  </Badge>
                </div>
                
                <div className="bg-gradient-to-br from-primary/20 to-secondary/30 rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {clusterCount} clusters · {personCount} people
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Venues Preview */}
        <motion.div
          layout
          initial={{ opacity: 0, translateX: 20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card 
            className="h-full cursor-pointer hover:scale-[1.02] transition-all duration-200 hover:shadow-lg border-2 hover:border-primary/20"
            onClick={onVenuesPress}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <Utensils className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Venues That Match</h3>
                  <p className="text-xs text-muted-foreground">Your vibe</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{venueCount} recommendations</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round((topVenue?.vibeMatch.score || 0) * 100)}% match
                  </Badge>
                </div>
                
                {topVenue && (
                  <div className="bg-gradient-to-br from-secondary/10 to-accent/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-foreground truncate">
                      {topVenue.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">
                        {topVenue.crowdIntelligence.typicalCrowd}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Nearby Floqs Preview */}
        <motion.div
          layout
          initial={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card 
            className="h-full cursor-pointer hover:scale-[1.02] transition-all duration-200 hover:shadow-lg border-2 hover:border-primary/20"
            onClick={onFloqsPress}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Waves className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Nearby Floqs</h3>
                  <p className="text-xs text-muted-foreground">Active gatherings</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Closest: {closestDistance}</span>
                  <Badge variant="outline" className="text-xs">
                    {activeNow} LIVE
                  </Badge>
                </div>
                
                <div className="bg-gradient-to-br from-accent/10 to-primary/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {floqCount} floqs nearby
                  </p>
                  <div className="flex items-center gap-2">
                    <Circle size={8} className="text-emerald-500 fill-current" />
                    <span className="text-xs text-muted-foreground">
                      Popular vibe: {topVibe}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};