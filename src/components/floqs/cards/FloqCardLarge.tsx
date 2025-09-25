import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFloqScores } from "@/hooks/useFloqScores";
import { openFloqPeek } from "@/lib/peek";
import { TTLArc } from "@/components/floqs/visual/TTLArc";
import { CohesionRing } from "@/components/floqs/visual/CohesionRing";
import { MetricChip } from "@/components/floqs/metrics/MetricChip";
import { useJoinIntent } from "@/hooks/useJoinIntent";
import { RippleIndicator } from "@/components/floqs/visual/RippleIndicator";
import { MemberParticles } from "@/components/floqs/visual/MemberParticles";
import { PartialRevealAvatarStack } from "@/components/floqs/visual/PartialRevealAvatarStack";
import type { AvatarItem } from "@/components/floqs/visual/AvatarStack";

export type FloqLargeItem = {
  id: string;
  name: string;
  status: "live" | "upcoming" | "ended";
  starts_at?: string; ends_at?: string;
  participants?: number; friends_in?: number;
  friend_faces?: Array<{ id: string; name?: string; avatar_url?: string | null; floq_id?: string | null }>;
  friend_avatars?: string[];
  recsys_score?: number; energy_now?: number; energy_peak?: number;
  eta_minutes?: number; vibe_delta?: number;
  door_policy?: "open"|"cover"|"line"|"guest"|null;
  cohesion?: number;
};

export function FloqCardLarge({ item }: { item: FloqLargeItem }) {
  const nav = useNavigate();
  const { compatibilityPct, friction, energyNow } = useFloqScores(item);
  const live = item.status === "live";
  const frictionLabel = friction < 0.25 ? "Low" : friction < 0.6 ? "Moderate" : "High";

  const intent = useJoinIntent(item.id).stage;
  const faces: AvatarItem[] = React.useMemo(() => {
    if (Array.isArray(item.friend_faces)) {
      return item.friend_faces.map((f, i) => ({
        id: String(f.id ?? i),
        name: f.name ?? "",
        imageUrl: f.avatar_url ?? null,
        floqId: f.floq_id ?? item.id,
      }));
    }
    if (Array.isArray(item.friend_avatars)) {
      return item.friend_avatars.map((url, i) => ({ id: String(i), name: "", imageUrl: url, floqId: item.id }));
    }
    const n = item.friends_in ?? 0;
    return Array.from({ length: Math.min(n, 4) }, (_, i) => ({
      id: String(i), name: `Friend ${i + 1}`, imageUrl: null, floqId: item.id,
    }));
  }, [item]);
  const revealCount = intent === "commit" ? faces.length : intent === "consider" ? 2 : 0;

  const onOpen = () => nav(`/floq/${item.id}`);
  
  // Visual effects based on floq state
  const energyLevel = energyNow * 100;
  const isHighEnergy = energyLevel > 70;
  const isLive = live;
  const glowIntensity = Math.max(0.3, energyNow);

  return (
    <div className="relative group">
      <Card className={`
        relative cursor-pointer transition-all duration-500 overflow-hidden
        ${isLive ? 'shadow-[var(--glow-primary)]' : 'shadow-lg'} 
        hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1
        ${isHighEnergy ? 'animate-glow-flow' : ''}
      `}
            onClick={onOpen} role="button" aria-label={`Open ${item.name}`}>
        
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        {/* Energy flow effect for high energy floqs */}
        {isHighEnergy && (
          <div className="floq-energy-flow" aria-hidden="true" />
        )}
        
        {/* Live indicator glow */}
        {isLive && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 pointer-events-none rounded-lg animate-pulse" />
        )}

        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="truncate text-xl relative">
              {item.name}
              {/* Active floq ripple indicator */}
              {isLive && (
                <div className="absolute -top-1 -right-1">
                  <RippleIndicator active={true} size={16} />
                </div>
              )}
            </CardTitle>
            <span className={`
              text-xs rounded px-2 py-0.5 backdrop-blur-sm border transition-all duration-300
              ${isLive 
                ? 'bg-primary/20 text-primary-foreground border-primary/30 shadow-[0_0_8px_hsl(var(--primary)/0.4)]' 
                : item.status === "upcoming" 
                ? 'bg-accent/20 text-accent-foreground border-accent/30' 
                : 'bg-secondary/60 text-secondary-foreground border-border'
              }
            `}>
              {item.status === "live" ? "Live" : item.status === "upcoming" ? "Soon" : "Ended"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 relative">
          {/* Chips with enhanced styling */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <MetricChip label="Compatibility" ringValue={compatibilityPct/100} text={`${compatibilityPct}%`} live={live} />
              {compatibilityPct > 80 && (
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full -z-10 animate-pulse" />
              )}
            </div>
            <MetricChip label="Friction" ringValue={Math.max(0.05, 1 - friction)} text={frictionLabel} live={live} />
            <div className="relative">
              <MetricChip label="Energy" ringValue={energyNow} text={`${Math.round(energyNow*100)}%`} live={live} />
              {isHighEnergy && (
                <div className="absolute inset-0 rounded-full shadow-[0_0_12px_hsl(var(--primary)/0.6)] animate-pulse" />
              )}
            </div>
          </div>

          {/* Participants + friends with glow */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{(item.participants ?? 0)} in</div>
            {faces.length > 0 && (
              <div className="relative">
                <PartialRevealAvatarStack
                  items={faces}
                  revealCount={revealCount}
                  size={22}
                  overlap={7}
                  onAvatarPress={(a, e) => { e.stopPropagation(); openFloqPeek(a.floqId || item.id); }}
                />
                {/* Friends in floq glow */}
                {faces.length > 2 && (
                  <div className="absolute -inset-2 bg-gradient-radial from-accent/30 to-transparent rounded-full -z-10 opacity-60" />
                )}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2 relative">
          <Button variant="outline" size="sm"
            className="backdrop-blur-sm border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300"
            onClick={(e)=>{ e.stopPropagation(); openFloqPeek(item.id); }}>
            Peek
          </Button>
          <Button size="sm" 
            className="shadow-[var(--glow-secondary)] hover:shadow-[var(--glow-primary)] transition-all duration-300 hover:scale-105"
            onClick={(e)=>{ e.stopPropagation(); onOpen(); }}>
            Open
          </Button>
        </CardFooter>
      </Card>

      {/* Overlays */}
      <CohesionRing cohesion={item.cohesion ?? 0.6} />
      {item.starts_at && item.ends_at && <TTLArc startsAt={item.starts_at} endsAt={item.ends_at} />}
      
      {/* Member particles for active floqs */}
      {(item.participants ?? 0) > 3 && isLive && (
        <div className="absolute top-2 right-2 pointer-events-none">
          <MemberParticles live={isLive} rings={2} dotsPerRing={2} size={40} />
        </div>
      )}
    </div>
  );
}