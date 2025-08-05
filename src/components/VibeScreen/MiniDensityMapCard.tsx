import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useVibeClusterStats } from '@/hooks/useVibeClusterStats';
import { cn } from '@/lib/utils';

interface Props { className?: string; onPress?: () => void }

export const MiniDensityMapCard: React.FC<Props> = ({ className, onPress }) => {
  const { clusterCount, personCount } = useVibeClusterStats();
  // Use environment variable for Mapbox static API, fallback to placeholder
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.placeholder';
  const staticSrc = `https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/pin-s-a+9ed4bd(-122.46,37.77),pin-s-b+000(-122.42,37.78),pin-s-c+000(-122.48,37.76)/-122.4194,37.7749,11/400x200?access_token=${mapboxToken}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      className={cn('px-4', className)}
    >
      <div 
        onClick={onPress} 
        className="overflow-hidden rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform"
      >
        <Card>
          <CardHeader>
            <CardTitle>Vibe Clusters Nearby — LIVE</CardTitle>
          </CardHeader>
          <CardContent className="relative aspect-[16/9]">
            <img 
              src={staticSrc} 
              alt="Vibe density map"
              className="absolute inset-0 w-full h-full object-cover rounded-lg"
              onError={(e) => {
                // Fallback to a gradient background if mapbox fails
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/40 rounded-lg" />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-white font-medium drop-shadow-lg">
                {clusterCount} clusters · {personCount} people
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};