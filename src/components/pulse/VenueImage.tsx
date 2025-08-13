import React, { useState } from 'react';
import { MapPin, Calendar, Users } from 'lucide-react';
import { isGooglePlacesImageUrl } from '@/lib/utils/images';

interface VenueImageProps {
  src?: string;
  alt: string;
  type: 'venue' | 'event' | 'floq';
  className?: string;
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

const getFallbackImage = (type: string) => {
  switch (type) {
    case 'venue':
      return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop'; // Restaurant interior
    case 'event':
      return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop'; // Event/concert
    case 'floq':
      return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop'; // Group of people
    default:
      return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop';
  }
};

export const VenueImage: React.FC<VenueImageProps> = ({
  src,
  alt,
  type,
  className = "w-16 h-16 rounded-xl object-cover"
}) => {
  const [imageError, setImageError] = useState(false);
  const [showFallbackImage, setShowFallbackImage] = useState(false);

  const handleImageError = () => {
    if (!showFallbackImage && src && !isGooglePlacesImageUrl(src)) {
      // First try fallback image if original wasn't from Google
      setShowFallbackImage(true);
    } else {
      // Show icon fallback
      setImageError(true);
    }
  };

  const handleFallbackError = () => {
    setImageError(true);
  };

  // If no src provided or error occurred, show icon
  if (!src || imageError || isGooglePlacesImageUrl(src)) {
    return (
      <div className={`${className.replace('object-cover', '')} bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center`}>
        {getTypeIcon(type)}
      </div>
    );
  }

  // Show fallback image if original failed and it's not from Google
  const imageSrc = showFallbackImage ? getFallbackImage(type) : src;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={showFallbackImage ? handleFallbackError : handleImageError}
      loading="lazy"
    />
  );
};