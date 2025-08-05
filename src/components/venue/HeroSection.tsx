import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  venue: {
    name: string;
    vibe?: string;
    popularity: number;
    heroUrl?: string;
  };
}

export const HeroSection: React.FC<HeroSectionProps> = ({ venue }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <div className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
        {venue.heroUrl ? (
          <img
            src={venue.heroUrl}
            alt={venue.name}
            loading="lazy"
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="w-16 h-16 text-primary/40" />
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-background/90">
              {venue.vibe || 'Social'} Vibe
            </Badge>
            <Badge variant="outline" className="bg-background/90">
              Popularity: {venue.popularity}%
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};