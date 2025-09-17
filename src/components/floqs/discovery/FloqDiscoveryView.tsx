import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { CommitmentLadder } from "./CommitmentLadder";
import { MemberParticles } from "../visual/MemberParticles";
import { useFloqScores } from "@/hooks/useFloqScores";
import type { FloqCardItem } from "../cards/FloqCard";
import { cn } from "@/lib/utils";

interface FloqDiscoveryViewProps {
  item: FloqCardItem;
  onCommitmentChange: (stage: "watch" | "consider" | "commit") => void;
  currentStage: "watch" | "consider" | "commit";
}

export function FloqDiscoveryView({ item, onCommitmentChange, currentStage }: FloqDiscoveryViewProps) {
  const { compatibilityPct, friction, energyNow } = useFloqScores(item);
  const navigate = useNavigate();
  const { triggerHaptic } = useHapticFeedback();
  const participantCount = item.participants ?? item.participant_count ?? 0;
  const friendsCount = item.friends_in ?? 0;
  
  // Calculate social proof metrics
  const watcherCount = Math.floor(participantCount * 0.3); // Simulated watchers
  const consideringCount = Math.floor(participantCount * 0.2); // Simulated considering
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="relative pb-4">
        {/* Anonymous particle cloud visualization */}
        <div className="absolute top-4 right-4">
          <MemberParticles 
            live={item.status === "live"}
            rings={3}
            dotsPerRing={Math.max(2, Math.min(6, Math.floor(participantCount / 3)))}
            size={60}
            className="opacity-60"
          />
        </div>
        
        <CardTitle className="flex items-center gap-2 pr-16">
          <span className="truncate">{item.name || item.title || "Anonymous Floq"}</span>
          <Badge variant={item.status === "live" ? "default" : "secondary"}>
            {item.status === "live" ? "Live" : "Soon"}
          </Badge>
        </CardTitle>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{participantCount} anonymous participants</span>
          </div>
          {friendsCount > 0 && (
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="text-primary font-medium">{friendsCount} friends involved</span>
            </div>
          )}
          {item.ends_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{getTimeRemaining(item.ends_at)}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Compatibility & Metrics */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">{compatibilityPct}%</div>
            <div className="text-xs text-muted-foreground">Match</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-500">{Math.round(energyNow * 100)}%</div>
            <div className="text-xs text-muted-foreground">Energy</div>
          </div>
          <div className="space-y-1">
            <div className={cn(
              "text-2xl font-bold",
              friction < 0.3 ? "text-green-500" : friction < 0.6 ? "text-yellow-500" : "text-red-500"
            )}>
              {friction < 0.3 ? "Low" : friction < 0.6 ? "Med" : "High"}
            </div>
            <div className="text-xs text-muted-foreground">Friction</div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="bg-muted/20 rounded-lg p-3 space-y-2">
          <div className="text-sm font-medium">Social Activity</div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{watcherCount} watching</span>
            <span>{consideringCount} considering</span>
          </div>
        </div>

        {/* Commitment Ladder */}
        <CommitmentLadder 
          currentStage={currentStage}
          onStageChange={onCommitmentChange}
          watcherCount={watcherCount}
          consideringCount={consideringCount}
        />

        {/* Navigation Options */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 touch-target"
            onClick={() => {
              triggerHaptic('light');
              navigate(`/floqs/${item.id}`);
            }}
          >
            Go to Floq
          </Button>
          <Button
            size="sm"
            className="flex-1 touch-target"
            onClick={() => {
              triggerHaptic('light');
              onCommitmentChange("consider");
            }}
          >
            Learn More
          </Button>
        </div>

        {/* Privacy Notice */}
        {currentStage !== "commit" && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3">
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <div className="font-medium mb-1">🔒 Anonymous Mode</div>
              You appear invisible to others until you commit. Perfect for exploring without pressure.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getTimeRemaining(endsAt: string): string {
  const now = Date.now();
  const end = new Date(endsAt).getTime();
  const diffMs = end - now;
  
  if (diffMs <= 0) return "Ended";
  
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m left`;
  
  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  return `${diffHours}h ${remainingMins}m left`;
}