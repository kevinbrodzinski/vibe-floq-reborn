import { MapPin, Users, DollarSign, Star, Plus } from "lucide-react";
import { VenueMatchOverlay } from "./VenueMatchOverlay";
import { useState } from "react";

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
            <h4 className="font-medium text-sm truncate">{venue.name}</h4>
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

          {venue.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {venue.description}
            </p>
          )}

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

        <button
          onClick={onAdd}
          className="ml-3 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-200"
          aria-label={`Add ${venue.name} to plan`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};