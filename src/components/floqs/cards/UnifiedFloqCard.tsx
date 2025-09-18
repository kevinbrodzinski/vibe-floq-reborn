import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressDonut } from "@/components/floqs/visual/ProgressDonut";
import { AvatarStack, AvatarItem } from "@/components/floqs/visual/AvatarStack";
import { PartialRevealAvatarStack } from "@/components/floqs/visual/PartialRevealAvatarStack";
import { CohesionRing } from "@/components/floqs/visual/CohesionRing";
import { MemberParticles } from "@/components/floqs/visual/MemberParticles";
import { VibeGradient, VibeType } from "@/components/floqs/visual/VibeGradient";
import { EnergyFlowParticles } from "@/components/floqs/visual/EnergyFlowParticles";
import { RippleIndicator } from "@/components/floqs/visual/RippleIndicator";
import { TTLArc } from "@/components/floqs/visual/TTLArc";
import { useFloqScores } from "@/hooks/useFloqScores";
import { useJoinIntent } from "@/hooks/useJoinIntent";
import { openFloqPeek } from "@/lib/peek";

export interface UnifiedFloqItem {
  id: string;
  name?: string;
  title?: string;
  status: "live" | "upcoming" | "ended";
  starts_at?: string;
  ends_at?: string;
  participants?: number;
  friends_in?: number;
  friend_faces?: Array<{ id: string; name: string; avatar_url?: string | null; floq_id?: string | null }>;
  friend_avatars?: string[];
  recsys_score?: number;
  energy_now?: number;
  energy_peak?: number;
  eta_minutes?: number;
  door_policy?: "open" | "cover" | "line" | "guest" | null;
}

export function UnifiedFloqCard({ item }: { item: UnifiedFloqItem }) {
  const navigate = useNavigate();
  const { compatibilityPct, friction, energyNow, peakRatio } = useFloqScores(item);
  const intent = useJoinIntent(item.id).stage;
  
  const displayName = item.name || item.title || "Untitled";
  const live = item.status === "live";
  const frictionLabel = friction < 0.25 ? "Low" : friction < 0.6 ? "Moderate" : "High";
  
  // Calculate cohesion based on compatibility and energy
  const cohesion = (compatibilityPct / 100 + energyNow) / 2;
  
  // Determine vibe from item or derive from energy/compatibility
  const vibe: VibeType = (item as any).vibe || (item as any).primary_vibe || 
    (energyNow > 0.7 ? "hype" : energyNow > 0.4 ? "social" : "chill");

  // Normalize friend data
  const friends: AvatarItem[] = React.useMemo(() => {
    if (Array.isArray(item.friend_faces)) {
      return item.friend_faces.map((f: any, idx: number) => ({
        id: String(f.id ?? idx),
        name: f.name ?? "",
        imageUrl: f.avatar_url ?? null,
        floqId: f.floq_id ?? item.id,
      }));
    }
    if (Array.isArray(item.friend_avatars)) {
      return item.friend_avatars.map((url: string, idx: number) => ({
        id: String(idx),
        name: "",
        imageUrl: url,
        floqId: item.id,
      }));
    }
    if (item.friends_in && item.friends_in > 0) {
      return Array.from({ length: Math.min(item.friends_in, 4) }, (_, idx) => ({
        id: String(idx),
        name: `Friend ${idx + 1}`,
        imageUrl: null,
        floqId: item.id,
      }));
    }
    return [];
  }, [item]);

  const revealCount = intent === "commit" ? friends.length : intent === "consider" ? 2 : 0;

  const handleCardClick = () => {
    navigate(`/floqs/${item.id}`);
  };

  const handlePeekClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openFloqPeek(item.id);
  };

  const handleHQClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/floqs/${item.id}/hq`);
  };

  return (
    <Card 
      className="relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 bg-card/80 backdrop-blur border-border/50"
      onClick={handleCardClick}
    >
      {/* Vibe gradient background */}
      <VibeGradient vibe={vibe} intensity={energyNow} />
      
      {/* Cohesion ring */}
      <CohesionRing cohesion={cohesion} colorVar={live ? "--floq-gauge-live-1" : "--floq-gauge-soon-1"} />
      
      {/* Energy flow particles */}
      <EnergyFlowParticles 
        energy={energyNow} 
        peakRatio={peakRatio || 0} 
        live={live} 
      />
      
      {/* TTL Arc for momentary floqs */}
      {item.starts_at && item.ends_at && (
        <TTLArc 
          startsAt={item.starts_at} 
          endsAt={item.ends_at} 
          colorVar={live ? "--floq-gauge-live-1" : "--floq-gauge-soon-1"}
        />
      )}
      
      {/* Ripple indicator for notifications/activity */}
      <div className="absolute top-2 left-2">
        <RippleIndicator active={live && energyNow > 0.6} size={24} />
      </div>

      {/* Header */}
      <div className="p-4 pb-3 relative z-10">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-lg font-semibold truncate">{displayName}</h3>
          <div className="flex items-center gap-2">
            {/* Member particles for high energy floqs */}
            {energyNow > 0.5 && (
              <MemberParticles 
                live={live}
                rings={Math.ceil(energyNow * 2)}
                dotsPerRing={2}
                size={32}
              />
            )}
            <Badge variant={live ? "default" : "secondary"}>
              {item.status === "live" ? "Live" : item.status === "upcoming" ? "Soon" : "Ended"}
            </Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {(item.participants ?? 0)} participants
        </div>
      </div>

      {/* Metrics Row */}
      <div className="px-4 pb-3 relative z-10">
        <div className="grid grid-cols-3 gap-4">
          {/* Compatibility */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <ProgressDonut value={compatibilityPct / 100} size={28} stroke={3} live={live} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-muted-foreground">Compat</div>
              <div className="text-sm font-medium">{compatibilityPct}%</div>
            </div>
          </div>

          {/* Friction */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <ProgressDonut value={Math.max(0.05, 1 - friction)} size={28} stroke={3} live={live} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-muted-foreground">Friction</div>
              <div className="text-sm font-medium">{frictionLabel}</div>
            </div>
          </div>

          {/* Energy */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <ProgressDonut value={energyNow} size={28} stroke={3} live={live} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-muted-foreground">Energy</div>
              <div className="text-sm font-medium">{Math.round(energyNow * 100)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Friends and Actions */}
      <div className="px-4 pb-4 flex items-center justify-between relative z-10">
        <div className="min-w-0 flex-1">
          {friends.length > 0 && (
            <>
              {revealCount > 0 ? (
                <AvatarStack
                  items={friends.slice(0, revealCount)}
                  max={4}
                  size={20}
                  overlap={6}
                  onAvatarPress={(a, e) => {
                    e.stopPropagation();
                    openFloqPeek(a.floqId || item.id);
                  }}
                />
              ) : (
                <PartialRevealAvatarStack
                  items={friends}
                  revealCount={0}
                  max={4}
                  size={20}
                  overlap={6}
                />
              )}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePeekClick}
            className="text-xs"
          >
            Peek
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleHQClick}
            className="text-xs bg-primary/10 hover:bg-primary/20 border-primary/30"
          >
            HQ
          </Button>
        </div>
      </div>
    </Card>
  );
}