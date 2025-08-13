import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react';
import { VenueImage } from './VenueImage';

export type VenueCarouselItem = {
  id: string;
  name: string;
  subtitle?: string;
  photoUrl?: string | null;
  distance?: number | string | null;
  rating?: number | null;
  vibeMatch?: number | null;
  weatherMatch?: number | null;
  liveCount?: number;
  tags?: string[] | null;
};

// Utility function to format distance
const formatDistance = (distance?: number | string | null): string | null => {
  if (distance == null) return null;
  const meters = typeof distance === 'string' ? parseFloat(distance) : distance;
  if (!Number.isFinite(meters) || meters <= 0) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

// Pill component for tags and badges
function Pill({ children, variant = 'default' }: { 
  children: React.ReactNode; 
  variant?: 'default' | 'accent' | 'success';
}) {
  const variants = {
    default: 'bg-white/15 text-white/90 border-white/20',
    accent: 'bg-amber-400/20 text-amber-300 border-amber-300/30',
    success: 'bg-green-400/20 text-green-300 border-green-300/30'
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] leading-none font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
}

interface VenueCarouselProps {
  items: VenueCarouselItem[];
  loading?: boolean;
  onOpen?: (id: string) => void;
  className?: string;
  aspect?: string;
}

export const VenueCarousel: React.FC<VenueCarouselProps> = ({
  items,
  loading = false,
  onOpen,
  className = '',
  aspect = '3/4'
}) => {
  // Snap-to-center carousel configuration
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    dragFree: false,            // Snap after drag
    align: 'center',            // Center active card
    containScroll: 'trimSnaps',
    inViewThreshold: 0.75,
  });

  const [selected, setSelected] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on('select', onSelect);
    setCount(emblaApi.scrollSnapList().length);
    return () => emblaApi.off('select', onSelect);
  }, [emblaApi]);

  const scrollPrev = React.useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = React.useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = React.useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  // Coverflow animation: scale and lift center card
  const getCardAnimation = (isActive: boolean) => ({
    scale: isActive ? 1 : 0.9,
    y: isActive ? 0 : 12,
    opacity: isActive ? 1 : 0.8,
    boxShadow: isActive
      ? '0 16px 40px rgba(0,0,0,0.38)'
      : '0 10px 24px rgba(0,0,0,0.28)',
    transition: { type: 'spring', stiffness: 240, damping: 22 },
  });

  // Show skeleton cards while loading
  const displayItems = loading
    ? Array.from({ length: 5 }).map((_, i) => ({ 
        id: `skeleton-${i}`, 
        name: '', 
        photoUrl: null 
      }))
    : items;

  if (displayItems.length === 0) {
    return (
      <div className={`text-center py-8 text-white/60 ${className}`}>
        No venues found
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Edge fade gradients */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0B0F1A] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0B0F1A] to-transparent z-10" />

      {/* Navigation arrows */}
      <button
        type="button"
        onClick={scrollPrev}
        className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/10 border border-white/15 backdrop-blur hover:bg-white/20 transition-all duration-200 flex items-center justify-center"
        aria-label="Previous venue"
      >
        <ChevronLeft className="h-5 w-5 text-white" />
      </button>
      
      <button
        type="button"
        onClick={scrollNext}
        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/10 border border-white/15 backdrop-blur hover:bg-white/20 transition-all duration-200 flex items-center justify-center"
        aria-label="Next venue"
      >
        <ChevronRight className="h-5 w-5 text-white" />
      </button>

      {/* Carousel viewport */}
      <div className="px-2 sm:px-4">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4 sm:gap-5">
            {displayItems.map((venue, index) => {
              const isActive = index === selected;
              
              return (
                <div
                  key={venue.id}
                  className="basis-[80%] sm:basis-[58%] md:basis-[46%] lg:basis-[36%] xl:basis-[30%] shrink-0"
                >
                  <motion.button
                    type="button"
                    onClick={() => venue.name && onOpen?.(venue.id)}
                    whileTap={{ scale: 0.98 }}
                    className={`relative w-full text-left rounded-3xl overflow-hidden bg-white/5 border border-white/10 ${aspect === '3/4' ? 'aspect-[3/4]' : 'aspect-[4/5]'}`}
                    animate={getCardAnimation(isActive)}
                    disabled={!venue.name || loading}
                  >
                    {/* Venue image */}
                    <div className="absolute inset-0">
                      <VenueImage
                        src={venue.photoUrl}
                        alt={venue.name || 'Venue'}
                        type="venue"
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Gradient overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/60" />
                    </div>

                    {/* Content overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                      <div className="backdrop-blur-md bg-white/10 border border-white/15 rounded-2xl px-3.5 py-3">
                        <div className="flex items-center justify-between gap-3">
                          {/* Left side - venue info */}
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-semibold text-sm sm:text-base truncate">
                              {venue.name || (loading ? 'Loading...' : 'Unknown Venue')}
                            </div>
                            
                            {venue.subtitle && (
                              <div className="text-white/80 text-xs truncate">
                                {venue.subtitle}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm truncate mt-1">
                              {formatDistance(venue.distance) && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 opacity-80" />
                                  {formatDistance(venue.distance)}
                                </span>
                              )}
                              
                              {venue.rating && (
                                <span className="inline-flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                                  {venue.rating.toFixed(1)}
                                </span>
                              )}
                              
                              {venue.liveCount && venue.liveCount > 0 && (
                                <span className="text-green-400">
                                  • {venue.liveCount} here now
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right side - badges and tags */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {/* Match scores */}
                            <div className="flex gap-1">
                              {venue.vibeMatch && (
                                <Pill variant="accent">
                                  ⚡ {Math.round(venue.vibeMatch)}%
                                </Pill>
                              )}
                              {venue.weatherMatch && venue.weatherMatch > 80 && (
                                <Pill variant="success">
                                  🌤️ {Math.round(venue.weatherMatch)}%
                                </Pill>
                              )}
                            </div>
                            
                            {/* Tags */}
                            {venue.tags && venue.tags.length > 0 && (
                              <div className="flex gap-1 max-w-[140px] sm:max-w-[180px] overflow-hidden">
                                {venue.tags.slice(0, 2).map((tag) => (
                                  <Pill key={tag} variant="default">
                                    {tag.replace(/_/g, ' ')}
                                  </Pill>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      {count > 1 && !loading && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === selected ? 'w-6 bg-white' : 'w-2.5 bg-white/35 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};