import React, { useState } from 'react';
import { MapPin, Calendar, Users } from 'lucide-react';
import { getContextualVenueImage } from '@/lib/utils/images';

interface VenueImageProps {
  src?: string;
  alt: string;
  type: 'venue' | 'event' | 'floq';
  className?: string;
  venue?: {
    id?: string;
    name?: string;
    categories?: string[];
    canonical_tags?: string[];
  };
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'venue':
      return <MapPin className="w-6 h-6 text-white" />;
    case 'event':
      return <Calendar className="w-6 h-6 text-white" />;
    case 'floq':
      return <Users className="w-6 h-6 text-white" />;
    default:
      return <MapPin className="w-6 h-6 text-white" />;
  }
};

const getFallbackImage = (type: string, venue?: VenueImageProps['venue']) => {
  switch (type) {
    case 'venue':
      return venue ? getContextualVenueImage(venue) : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop';
    case 'event':
      return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop';
    case 'floq':
      return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop';
    default:
      return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop';
  }
};

export const VenueImage: React.FC<VenueImageProps> = ({
  src,
  alt,
  type,
  className = "w-16 h-16 rounded-xl object-cover",
  venue
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [fallbackLevel, setFallbackLevel] = useState(0);

  const handleImageError = () => {
    if (fallbackLevel === 0 && src) {
      // First error: try contextual fallback
      console.warn(`🖼️ Original image failed, trying contextual fallback: ${src}`);
      setCurrentSrc(getFallbackImage(type, venue));
      setFallbackLevel(1);
    } else if (fallbackLevel === 1) {
      // Second error: show icon
      console.warn(`🖼️ Contextual fallback also failed, showing icon`);
      setFallbackLevel(2);
    }
  };

  // If no src provided or we've reached the icon fallback level
  if (!src || fallbackLevel === 2) {
    return (
      <div className={`${className.replace('object-cover', '')} bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center`}>
        {getTypeIcon(type)}
      </div>
    );
  }

  return (
    <img
      src={currentSrc || src}
      alt={alt}
      className={className}
      onError={handleImageError}
      loading="lazy"
    />
  );
};