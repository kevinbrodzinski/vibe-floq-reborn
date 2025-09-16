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
import { PartialRevealAvatarStack } from "@/components/floqs/visual/PartialRevealAvatarStack";
import type { AvatarItem } from "@/components/floqs/visual/AvatarStack";

export type FloqLargeItem = {
  id: string;
  name: string;
  status: "live"|"upcoming"|"ended";
  starts_at?: string; ends_at?: string;
  participants?: number; friends_in?: number;
  friend_faces?: Array<{id:string; name?:string; avatar_url?:string|null; floq_id?:string|null}>;
  friend_avatars?: string[];
  recsys_score?: number; energy_now?: number; energy_peak?: number;
  eta_minutes?: number; vibe_delta?: number; door_policy?: "open"|"cover"|"line"|"guest"|null;
  cohesion?: number;
};

export function FloqCardLarge({ item }: { item: FloqLargeItem }) {
  const nav = useNavigate();
  const { compatibilityPct, friction, energyNow, peakRatio } = useFloqScores(item);
  const live = item.status === "live";
  const frictionLabel = friction < 0.25 ? "Low" : friction < 0.6 ? "Moderate" : "High";

  const intent = useJoinIntent(item.id).stage;
  const faces: AvatarItem[] = React.useMemo(() => {
    if (Array.isArray(item.friend_faces)) {
      return item.friend_faces.map((f, i) => ({
        id: String(f.id ?? i), name: f.name ?? "", imageUrl: f.avatar_url ?? null, floqId: f.floq_id ?? item.id
      }));
    }
    if (Array.isArray(item.friend_avatars)) {
      return item.friend_avatars.map((url, i) => ({ id: String(i), name: "", imageUrl: url, floqId: item.id }));
    }
    const n = item.friends_in ?? 0;
    return Array.from({ length: Math.min(n, 4) }, (_, i) => ({ id: String(i), name: `Friend ${i+1}`, imageUrl: null, floqId: item.id }));
  }, [item]);

  const revealCount = intent === "commit" ? faces.length : intent === "consider" ? 2 : 0;

  const onOpen = () => nav(`/floq/${item.id}`);

  return (
    <div className="relative">
      <Card className="cursor-pointer transition hover:shadow-md"
            onClick={onOpen} role="button" aria-label={`Open ${item.name}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="truncate text-xl">{item.name}</CardTitle>
            <span className="text-xs rounded px-2 py-0.5 bg-secondary text-secondary-foreground">
              {item.status === "live" ? "Live" : item.status === "upcoming" ? "Soon" : "Ended"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Chips row */}
          <div className="flex flex-wrap items-center gap-2">
            <MetricChip label="Compatibility" ringValue={compatibilityPct/100} text={`${compatibilityPct}%`} live={live} />
            <MetricChip label="Friction"      ringValue={Math.max(0.05, 1 - friction)} text={frictionLabel} live={live} />
            <MetricChip label="Energy"        ringValue={energyNow} text={`${Math.round(energyNow*100)}%`} live={live} />
          </div>

          {/* Participants + friends */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{(item.participants ?? 0)} in</div>
            {faces.length > 0 && (
              <PartialRevealAvatarStack
                items={faces}
                revealCount={revealCount}
                size={22}
                overlap={7}
                onAvatarPress={(a)=>openFloqPeek(a.floqId || item.id)}
              />
            )}
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button variant="outline" size="sm" onClick={(e)=>{ e.stopPropagation(); openFloqPeek(item.id); }}>Peek</Button>
          <Button size="sm" onClick={(e)=>{ e.stopPropagation(); onOpen(); }}>Open</Button>
        </CardFooter>
      </Card>

      {/* Visual overlays (motion-safe) */}
      <CohesionRing cohesion={item.cohesion ?? 0.6} />
      {item.starts_at && item.ends_at && <TTLArc startsAt={item.starts_at} endsAt={item.ends_at} />}
    </div>
  );
}