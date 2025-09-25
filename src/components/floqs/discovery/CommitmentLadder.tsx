import * as React from "react";
import { Button } from "@/components/ui/button";
import { Eye, Heart, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommitmentLadderProps {
  currentStage: "watch" | "consider" | "commit";
  onStageChange: (stage: "watch" | "consider" | "commit") => void;
  watcherCount?: number;
  consideringCount?: number;
}

export function CommitmentLadder({ 
  currentStage, 
  onStageChange, 
  watcherCount = 0, 
  consideringCount = 0 
}: CommitmentLadderProps) {
  
  const stages = [
    {
      id: "watch" as const,
      label: "Watch",
      icon: Eye,
      description: "Stay anonymous, see updates",
      count: watcherCount,
      variant: "ghost" as const
    },
    {
      id: "consider" as const,
      label: "Consider",
      icon: Heart,
      description: "See some friends, get details",
      count: consideringCount,
      variant: "secondary" as const
    },
    {
      id: "commit" as const,
      label: "Commit",
      icon: CheckCircle,
      description: "Join fully, coordinate together",
      count: null,
      variant: "default" as const
    }
  ];

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-center">Choose your involvement</div>
      
      <div className="space-y-2">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = currentStage === stage.id;
          const isAccessible = 
            stage.id === "watch" || 
            (stage.id === "consider" && ["watch", "consider", "commit"].includes(currentStage)) ||
            (stage.id === "commit" && ["consider", "commit"].includes(currentStage));
          
          return (
            <Button
              key={stage.id}
              variant={isActive ? stage.variant : "outline"}
              className={cn(
                "w-full justify-start gap-3 h-auto p-3",
                isActive && "ring-2 ring-primary/50",
                !isAccessible && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => isAccessible && onStageChange(stage.id)}
              disabled={!isAccessible}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{stage.label}</span>
                  {stage.count !== null && stage.count > 0 && (
                    <span className="text-xs bg-muted px-2 py-1 rounded-full">
                      {stage.count}
                    </span>
                  )}
                </div>
                <div className="text-xs opacity-70">{stage.description}</div>
              </div>
              
              {/* Progress indicator */}
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index < stages.findIndex(s => s.id === currentStage) + 1
                  ? "bg-primary"
                  : "bg-muted"
              )} />
            </Button>
          );
        })}
      </div>
      
      {/* Stage transition hints */}
      <div className="text-xs text-center text-muted-foreground">
        {currentStage === "watch" && "↑ Considering reveals some friend details"}
        {currentStage === "consider" && "↑ Committing unlocks full coordination tools"}
        {currentStage === "commit" && "✅ Full access to flock coordination"}
      </div>
    </div>
  );
}