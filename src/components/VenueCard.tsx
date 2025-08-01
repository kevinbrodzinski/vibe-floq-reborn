import { MapPin, Users, DollarSign, Star, Plus, Heart } from "lucide-react";
import { VenueMatchOverlay } from "./VenueMatchOverlay";
import { useState } from "react";
import { useFavorites } from '@/hooks/useFavorites';
import { useVenueInteractions } from '@/hooks/useVenueInteractions';
import { cn } from '@/lib/utils';

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    vibe?: string;
    lat?: number;
    lng?: number;
    description?: string;
  };
  matchScore: number;
  reasoning: string[];
  estimatedCost: number;
  friendPresence: number;
  onAdd: () => void;
  className?: string;
}

export const VenueCard = ({
  venue,
  matchScore,
  reasoning,
  estimatedCost,
  friendPresence,
  onAdd,
  className = ""
}: VenueCardProps) => {
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const { toggleFavorite, isFavorite, isToggling } = useFavorites();
  const { favorite } = useVenueInteractions();
  
  const isVenueFavorited = isFavorite(venue.id);
  
  const handleHeartClick = async () => {
    const favData = {
      itemId: venue.id,
      itemType: 'venue' as const,
      title: venue.name,
      description: venue.description || `Venue in ${venue.vibe || 'unknown location'}`,
      imageUrl: undefined
    };
    
    try {
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          toggleFavorite(favData, {
            onSuccess: () => resolve(),
            onError: reject
          });
        }),
        new Promise<void>((resolve) => {
          favorite(venue.id);
          resolve();
        })
      ]);
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 0.8) return "text-green-400";
    if (score >= 0.6) return "text-yellow-400";
    return "text-orange-400";
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return "Free";
    return `$${cost}`;
  };

  return (
    <div className={`relative group bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-all duration-200 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-sm truncate">{venue.name || "Unnamed Venue"}</h4>
            <div 
              className="relative"
              onMouseEnter={() => setShowMatchDetails(true)}
              onMouseLeave={() => setShowMatchDetails(false)}
            >
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getMatchColor(matchScore)}`}>
                <Star className="w-3 h-3" />
                {Math.round(matchScore * 100)}%
              </div>
              
              {showMatchDetails && (
                <VenueMatchOverlay
                  matchScore={matchScore}
                  reasoning={reasoning}
                  className="absolute top-full left-0 z-10 mt-1"
                />
              )}
            </div>
          </div>

          {venue.description ? (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {venue.description}
            </p>
          ) : null}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{venue.vibe || "Location"}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>{formatCost(estimatedCost)}</span>
            </div>
            
            {friendPresence > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{friendPresence} friend{friendPresence !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        <div className="ml-3 flex items-center gap-1">
          <button
            onClick={handleHeartClick}
            disabled={isToggling}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-200",
              isVenueFavorited 
                ? "bg-pink-500/20 text-pink-500 hover:bg-pink-500/30" 
                : "bg-muted text-muted-foreground hover:bg-muted/80",
              isToggling && "opacity-50 cursor-not-allowed"
            )}
            aria-label={isVenueFavorited ? `Remove ${venue.name} from favorites` : `Add ${venue.name} to favorites`}
          >
            <Heart className={cn(
              "w-4 h-4 transition-colors",
              isVenueFavorited && "fill-current"
            )} />
          </button>
          
          <button
            onClick={onAdd}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-200"
            aria-label={`Add ${venue.name} to plan`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};