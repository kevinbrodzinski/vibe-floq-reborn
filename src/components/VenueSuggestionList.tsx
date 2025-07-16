import { useVenueSuggestions } from "@/hooks/useVenueSuggestions";
import { VenueCard } from "./VenueCard";
import { Loader2, MapPin, Sparkles } from "lucide-react";

interface VenueSuggestionListProps {
  planId: string;
  budgetRange?: { min: number; max: number };
  radiusKm?: number;
  onAddVenue: (venue: any) => void;
  className?: string;
}

export const VenueSuggestionList = ({
  planId,
  budgetRange,
  radiusKm = 2,
  onAddVenue,
  className = ""
}: VenueSuggestionListProps) => {
  const { data: suggestions, isLoading, error } = useVenueSuggestions({
    plan_id: planId,
    budget_range: budgetRange,
    radius_km: radiusKm
  });

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Finding perfect venues...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Unable to load venue suggestions</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No venue suggestions available</p>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your budget or radius</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium">AI Venue Suggestions</h3>
        <span className="text-xs text-muted-foreground">({suggestions.length} found)</span>
      </div>
      
      <div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto scrollbar-hide">
        {suggestions.map((suggestion, index) => (
          <VenueCard
            key={suggestion.venue.id || index}
            venue={suggestion.venue}
            matchScore={suggestion.match_score}
            reasoning={suggestion.reasoning}
            estimatedCost={suggestion.estimated_cost}
            friendPresence={suggestion.friend_presence}
            onAdd={() => onAddVenue(suggestion.venue)}
          />
        ))}
      </div>
    </div>
  );
};