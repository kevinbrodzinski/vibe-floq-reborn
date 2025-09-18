import * as React from "react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFloqScores } from "@/hooks/useFloqScores";
import { openFloqPeek } from "@/lib/peek";
import { ProgressDonut } from "../visual/ProgressDonut";
import { AvatarStack, AvatarItem } from "../visual/AvatarStack";
import { MetricsGrid } from "@/components/floqs/metrics/MetricsGrid";
import { useJoinIntent } from "@/hooks/useJoinIntent";
import { useSmartPeekTrigger } from "@/hooks/useSmartPeekTrigger";
import { usePerformanceOptimization } from "@/hooks/usePerformanceOptimization";
import { useLazyLoading } from "@/hooks/useLazyLoading";
import { useTouchGestures } from "@/hooks/useTouchGestures";
import { PartialRevealAvatarStack } from "../visual/PartialRevealAvatarStack";
import { PeakMarker } from "../visual/PeakMarker";
import { CohesionRing } from "../visual/CohesionRing";
import { VibeGradient, VibeType } from "../visual/VibeGradient";
import { EnergyFlowParticles } from "../visual/EnergyFlowParticles";
import { MemberParticles } from "../visual/MemberParticles";
import { TTLArc } from "../visual/TTLArc";
import { RippleIndicator } from "../visual/RippleIndicator";
import { cn } from "@/lib/utils";

export type FloqCardItem = {
  id: string;
  name?: string;
  title?: string;
  status: "live" | "upcoming" | "ended";
  starts_at?: string;
  ends_at?: string;
  participants?: number;
  participant_count?: number;
  friends_in?: number;
  vibe?: string;           // project vibe enum if available
  primary_vibe?: string;
  eta_minutes?: number;    // optional
  door_policy?: "open" | "cover" | "line" | "guest" | null;
  // passthrough for recsys metrics if present
  recsys_score?: number;   // 0..1
  energy_now?: number;     // 0..1
  energy_peak?: number;    // 0..1
};

export function FloqCard({ item, kind }: { item: FloqCardItem; kind: "tribe" | "discover" | "public" | "momentary" }) {
  const navigate = useNavigate();
  const { compatibilityPct, friction, energyNow, peakRatio } = useFloqScores(item);
  const frictionLabel = friction < 0.25 ? "Low" : friction < 0.6 ? "Moderate" : "High";
  
  const displayName = item.name || item.title || "Untitled";
  const participantCount = item.participants ?? item.participant_count ?? 0;

  // Enhanced peek with smart stage detection
  const { triggerSmartPeek } = useSmartPeekTrigger(item.id, item, {
    friendsInside: item.friends_in,
    compatibility: compatibilityPct / 100
  });

  // Performance optimization for visual effects
  const perfHook = usePerformanceOptimization();
  const shouldReduceEffects = perfHook.isPerformanceCritical();
  
  // Use simplified effects based on performance
  const particles = !shouldReduceEffects && energyNow > 0.3;
  const animations = !shouldReduceEffects;
  const reducedComplexity = shouldReduceEffects;

  // Lazy loading for off-screen cards - simplified for Phase 5
  const elementRef = useRef<HTMLDivElement>(null);
  const shouldLoad = true; // Always load for now

  // Touch gestures for mobile - simplified for Phase 5
  const touchBind = {
    onTouchStart: () => {},
    onTouchEnd: () => {},
  };

  const onOpen = triggerSmartPeek;

  const handleHQClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/floqs/${item.id}/hq`);
  };

  // For momentary cards, use the new layout
  if (kind === "momentary") {
    const intent = useJoinIntent(item.id).stage;
    const faces: AvatarItem[] = normalizeFaces(item);
    
    // Calculate cohesion and determine vibe
    const cohesion = (compatibilityPct / 100 + energyNow) / 2;
    const vibe: VibeType = (item as any).vibe || (item as any).primary_vibe || 
      (energyNow > 0.7 ? "hype" : energyNow > 0.4 ? "social" : "chill");
    const live = item.status === "live";
    
    const glowCls =
      "rounded-2xl border border-[hsl(var(--floq-card-border))] " +
      "bg-[hsl(var(--floq-card-bg)/0.5)] backdrop-blur " +
      "shadow-[0_0_0_1px_hsl(var(--border)),0_0_30px_hsl(var(--floq-card-glow)/0.15)] " +
      "transition-transform hover:-translate-y-[1px]";

    return (
      <div 
        ref={elementRef}
        className={cn("w-[92vw] max-w-[700px] relative", glowCls)} 
        onClick={onOpen} 
        role="button"
        {...touchBind}
      >
        {shouldLoad && (
          <>
            {/* Vibe gradient background */}
            <VibeGradient vibe={vibe} intensity={energyNow} />
            
            {/* Cohesion ring */}
            <CohesionRing cohesion={cohesion} colorVar={live ? "--floq-gauge-live-1" : "--floq-gauge-soon-1"} />
            
            {/* Energy flow particles - performance optimized */}
            {particles && !reducedComplexity && (
              <EnergyFlowParticles 
                energy={energyNow} 
                peakRatio={peakRatio || 0} 
                live={live} 
              />
            )}
            
            {/* TTL Arc for momentary floqs */}
            {animations && item.starts_at && item.ends_at && (
              <TTLArc 
                startsAt={item.starts_at} 
                endsAt={item.ends_at} 
                colorVar={live ? "--floq-gauge-live-1" : "--floq-gauge-soon-1"}
              />
            )}
            
            {/* Ripple indicator in corner */}
            <div className="absolute top-3 right-3">
              <RippleIndicator active={live && energyNow > 0.6 && animations} size={28} />
            </div>
          </>
        )}
        
        <div className="p-4 space-y-4 relative z-10">
          {/* Header with member particles */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{displayName}</h3>
            {/* Member particles for high energy floqs - performance optimized */}
            {energyNow > 0.5 && particles && !reducedComplexity && (
              <MemberParticles 
                live={live}
                rings={Math.ceil(energyNow * 2)}
                dotsPerRing={reducedComplexity ? 2 : 3}
                size={40}
              />
            )}
          </div>

          {/* Avatars block with enhanced reveal logic */}
          <div className="mt-1">
            {intent === "commit" ? (
              <AvatarStack items={faces} max={4} size={24} overlap={8} onAvatarPress={(a)=>openFloqPeek(a.floqId || item.id)} />
            ) : intent === "consider" ? (
              <PartialRevealAvatarStack items={faces} revealCount={2} size={24} overlap={8} onAvatarPress={(a)=>openFloqPeek(a.floqId || item.id)} />
            ) : (
              <PartialRevealAvatarStack items={faces} revealCount={0} size={24} overlap={8} />
            )}
          </div>

          {/* 3-card metric grid with peak marker */}
          <div className="mt-3">
            <MetricsGrid item={item} />
            <PeakMarker energyNow={energyNow} peakRatio={peakRatio} />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end mt-3 gap-2">
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
      </div>
    );
  }

  // Default card layout for other types
  return (
    <Card className="w-[260px] cursor-pointer transition hover:shadow-md" onClick={onOpen}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="truncate">{displayName}</CardTitle>
          <Badge variant={item.status === "live" ? "default" : "secondary"}>
            {item.status === "live" ? "Live" : item.status === "upcoming" ? "Soon" : "Ended"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p>Compatibility {Math.round(compatibilityPct)}%</p>
        <p>Friction {frictionLabel}</p>
        <p>Energy {Math.round(energyNow * 100)}% {peakRatio ? `(peak ${Math.round(peakRatio * 100)}%)` : ""}</p>
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>{participantCount} in</span>
          {item.friends_in ? <span>{item.friends_in} friends</span> : <span />}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleHQClick}
          className="text-xs bg-primary/10 hover:bg-primary/20 border-primary/30"
        >
          HQ
        </Button>
      </CardFooter>
    </Card>
  );
}

function timeLeft(item: FloqCardItem) {
  if (!item.starts_at || !item.ends_at) return "";
  const now = Date.now(), end = +new Date(item.ends_at);
  const m = Math.max(0, Math.round((end - now) / 60000));
  if (m === 0) return "<1 m left";
  if (m >= 60) return `${Math.floor(m/60)} h ${m%60} m left`;
  return `${m} m left`;
}

function normalizeFaces(item: any): AvatarItem[] {
  // Accept shapes like:
  // friend_faces: [{ id, name, avatar_url, floq_id? }]
  // friend_avatars: string[] (urls only)
  if (Array.isArray(item.friend_faces)) {
    return item.friend_faces.map((f: any, idx: number) => ({
      id: String(f.id ?? idx),
      name: f.name ?? "",
      imageUrl: f.avatar_url ?? f.imageUrl ?? null,
      floqId: f.floq_id ?? null,
    }));
  }
  if (Array.isArray(item.friend_avatars)) {
    return item.friend_avatars.map((url: string, idx: number) => ({
      id: String(idx),
      name: "",
      imageUrl: url,
      floqId: null,
    }));
  }
  // Fallback: create placeholder avatars based on friends_in count
  if (item.friends_in && typeof item.friends_in === 'number' && item.friends_in > 0) {
    return Array.from({ length: Math.min(item.friends_in, 4) }, (_, idx) => ({
      id: String(idx),
      name: `Friend ${idx + 1}`,
      imageUrl: null,
      floqId: null,
    }));
  }
  return [];
}