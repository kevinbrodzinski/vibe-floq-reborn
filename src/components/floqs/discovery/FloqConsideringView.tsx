import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, ArrowRight, Pause, X } from "lucide-react";
import { PartialRevealAvatarStack } from "../visual/PartialRevealAvatarStack";
import { LiveUpdatesScrollWithRealtime } from "./LiveUpdatesScrollWithRealtime";
import { CommitmentLadder } from "./CommitmentLadder";
import { useFloqScores } from "@/hooks/useFloqScores";
import type { FloqCardItem } from "../cards/FloqCard";
import type { AvatarItem } from "../visual/AvatarStack";

interface FloqConsideringViewProps {
  item: FloqCardItem;
  onCommitmentChange: (stage: "watch" | "consider" | "commit") => void;
  currentStage: "watch" | "consider" | "commit";
}

export function FloqConsideringView({ item, onCommitmentChange, currentStage }: FloqConsideringViewProps) {
  const { compatibilityPct, friction, energyNow } = useFloqScores(item);
  const [microCommitment, setMicroCommitment] = React.useState<string | null>(null);
  
  const participantCount = item.participants ?? item.participant_count ?? 0;
  const friendsCount = item.friends_in ?? 0;
  
  // Mock friend data - in real app this would come from API
  const friendFaces: AvatarItem[] = React.useMemo(() => {
    return Array.from({ length: Math.min(friendsCount, 6) }, (_, i) => ({
      id: `friend-${i}`,
      name: i < 3 ? `Friend ${i + 1}` : null, // Only show some names
      imageUrl: null,
      floqId: item.id
    }));
  }, [friendsCount, item.id]);

  // Mock live updates
  const liveUpdates = React.useMemo(() => [
    { id: "1", type: "commit" as const, message: "Alex just committed for the full evening", timestamp: Date.now() - 120000 },
    { id: "2", type: "energy" as const, message: "Energy shifting → hype mode", timestamp: Date.now() - 300000 },
    { id: "3", type: "join" as const, message: "2 new people considering", timestamp: Date.now() - 480000 }
  ], []);

  const microCommitmentOptions = [
    { id: "peek15", label: "15min peek", description: "Quick check-in" },
    { id: "hang1h", label: "1hr hang", description: "Medium commitment" },
    { id: "fullnight", label: "Full night", description: "All in" }
  ];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{item.name || item.title}</span>
          <Badge variant={item.status === "live" ? "default" : "secondary"}>
            {item.status === "live" ? "Live" : "Soon"}
          </Badge>
        </CardTitle>
        
        <div className="text-sm text-muted-foreground">
          {participantCount} people • {friendsCount} friends involved
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Partial reveal of friends */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Friends in this floq</div>
          <PartialRevealAvatarStack 
            items={friendFaces}
            revealCount={Math.min(3, friendsCount)}
            max={6}
            size={32}
            overlap={8}
            onAvatarPress={(avatar) => {
              // Could open friend profile or friend's floq activity
              console.log("Friend avatar pressed:", avatar);
            }}
          />
          <div className="text-xs text-muted-foreground">
            {friendFaces.length > 3 && `+${friendFaces.length - 3} more friends (commit to see all)`}
          </div>
        </div>

        <Separator />

        {/* Live activity feed */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Live updates</div>
          <LiveUpdatesScrollWithRealtime floqId={item.id} maxHeight="120px" showTimestamps />
        </div>

        <Separator />

        {/* Micro-commitment options */}
        <div className="space-y-2">
          <div className="text-sm font-medium">How long are you thinking?</div>
          <div className="grid grid-cols-1 gap-1">
            {microCommitmentOptions.map(option => (
              <Button
                key={option.id}
                variant={microCommitment === option.id ? "default" : "ghost"}
                size="sm"
                className="justify-between h-auto p-2"
                onClick={() => setMicroCommitment(option.id)}
              >
                <div className="text-left">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs opacity-70">{option.description}</div>
                </div>
                <ArrowRight className="w-3 h-3" />
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => window.location.href = `/floqs/${item.id}`}
          >
            Go to Floq
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onCommitmentChange("watch")}
          >
            <Pause className="w-3 h-3 mr-1" />
            Later
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onCommitmentChange("commit")}
            disabled={!microCommitment}
          >
            Commit
          </Button>
        </div>

        {/* Compatibility pulse indicator */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-3 text-center">
          <div className="text-sm font-medium text-primary">
            {compatibilityPct}% compatibility
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Based on your vibe preferences and location
          </div>
        </div>

        {/* Privacy reminder */}
        <div className="text-xs text-center text-muted-foreground bg-muted/20 rounded p-2">
          You're still anonymous to most people. Only close friends can see you're considering.
        </div>
      </CardContent>
    </Card>
  );
}