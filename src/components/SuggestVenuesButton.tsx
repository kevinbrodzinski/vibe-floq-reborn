import { useState } from "react";
import { Sparkles, MapPin, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SuggestVenuesButtonProps {
  planId: string;
  budgetRange?: { min: number; max: number };
  radiusKm?: number;
  onSuggestionsGenerated?: () => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const SuggestVenuesButton = ({
  planId,
  budgetRange,
  radiusKm = 2,
  onSuggestionsGenerated,
  className = "",
  variant = "outline",
  size = "default"
}: SuggestVenuesButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleSuggestVenues = async () => {
    if (!planId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Plan ID is required to generate venue suggestions"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulate AI venue suggestion generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Venues suggested",
        description: `Found ${Math.floor(Math.random() * 5) + 3} venues matching your criteria`,
      });
      
      onSuggestionsGenerated?.();
    } catch (error) {
      console.error('Error generating venue suggestions:', error);
      toast({
        variant: "destructive",
        title: "Failed to suggest venues",
        description: "Please try again in a moment"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatBudgetRange = () => {
    if (!budgetRange) return "Any budget";
    if (budgetRange.min === budgetRange.max) return `$${budgetRange.min}`;
    return `$${budgetRange.min}-${budgetRange.max}`;
  };

  return (
    <div className={className}>
      <Button
        variant={variant}
        size={size}
        onClick={handleSuggestVenues}
        disabled={isGenerating}
        className="relative group"
      >
        {isGenerating ? (
          <>
            <Sparkles className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2 group-hover:animate-pulse" />
            Suggest Venues
          </>
        )}
      </Button>
      
      {/* Criteria Preview */}
      {(budgetRange || radiusKm) && (
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {budgetRange && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>{formatBudgetRange()}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{radiusKm}km radius</span>
          </div>
        </div>
      )}
    </div>
  );
};