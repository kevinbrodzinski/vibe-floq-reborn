import { Star, TrendingUp } from "lucide-react";

interface VenueMatchOverlayProps {
  matchScore: number;
  reasoning: string[];
  className?: string;
}

export const VenueMatchOverlay = ({
  matchScore,
  reasoning,
  className = ""
}: VenueMatchOverlayProps) => {
  return (
    <div className={`bg-popover border border-border rounded-lg shadow-lg p-3 w-64 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-medium">Match Score: {Math.round(matchScore * 100)}%</span>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center gap-1 mb-1">
          <TrendingUp className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Why this works:</span>
        </div>
        
        {reasoning.slice(0, 3).map((reason, index) => (
          <div key={index} className="text-xs text-muted-foreground flex items-start gap-1">
            <span className="text-primary">•</span>
            <span>{reason}</span>
          </div>
        ))}
        
        {reasoning.length > 3 && (
          <div className="text-xs text-muted-foreground italic">
            +{reasoning.length - 3} more reasons
          </div>
        )}
      </div>
    </div>
  );
};