import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFloqScores } from "@/hooks/useFloqScores";
import { MetricChip } from "@/components/floqs/metrics/MetricChip";
import { PartialRevealAvatarStack } from "@/components/floqs/visual/PartialRevealAvatarStack";
import { openFloqPeek } from "@/lib/peek";
import { useJoinIntent } from "@/hooks/useJoinIntent";
import type { AvatarItem } from "@/components/floqs/visual/AvatarStack";

export type FloqRowItem = {
  id: string; name: string; status: "live"|"upcoming"|"ended";
  participants?: number; friends_in?: number;
  friend_faces?: Array<{id:string; name?:string; avatar_url?:string|null; floq_id?:string|null}>;
  friend_avatars?: string[];
  recsys_score?: number; energy_now?: number; energy_peak?: number;
  eta_minutes?: number; vibe_delta?: number; door_policy?: "open"|"cover"|"line"|"guest"|null;
};

export function FloqRow({ item }: { item: FloqRowItem }) {
  const nav = useNavigate();
  const { compatibilityPct, friction, energyNow } = useFloqScores(item);
  const live = item.status === "live";
  const frictionLabel = friction < 0.25 ? "Low" : friction < 0.6 ? "Moderate" : "High";

  const intent = useJoinIntent(item.id).stage;
  const faces: AvatarItem[] = React.useMemo(() => {
    if (Array.isArray(item.friend_faces)) {
      return item.friend_faces.map((f, i) => ({
        id: String(f.id ?? i), name: f.name ?? "", imageUrl: f.avatar_url ?? null, floqId: f.floq_id ?? item.id
      }));
    }
    const n = item.friends_in ?? 0;
    return Array.from({ length: Math.min(n, 4) }, (_, i) => ({
      id: String(i), name: `Friend ${i+1}`, imageUrl: null, floqId: item.id
    }));
  }, [item]);

  const reveal = intent === "commit" ? faces.length : intent === "consider" ? 2 : 0;

  const openPage = () => nav(`/floq/${item.id}`);
  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPage(); }
  };

  return (
    <Card
      className="floq-card-pro flex items-center justify-between gap-3 px-3 py-3 transition hover:shadow-lg"
      role="button" aria-label={`Open ${item.name}`} tabIndex={0}
      onClick={openPage} onKeyDown={onKeyDown}
    >
      {/* Left: title + status + avatars */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-lg font-semibold">{item.name}</h3>
          <span className="text-[10px] rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">
            {item.status === "live" ? "Live" : item.status === "upcoming" ? "Soon" : "Ended"}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{(item.participants ?? 0)} in</div>
        {faces.length > 0 && (
          <div className="mt-1">
            <PartialRevealAvatarStack
              items={faces} revealCount={reveal} size={20} overlap={7}
              onAvatarPress={(a,e)=>{ e.stopPropagation(); openFloqPeek(a.floqId || item.id); }}
            />
          </div>
        )}
      </div>

      {/* KPI chips */}
      <div className="hidden md:flex flex-col gap-1 mr-2">
        <MetricChip label="Compat"   ringValue={compatibilityPct/100} text={`${compatibilityPct}%`} live={live} />
        <MetricChip label="Friction" ringValue={Math.max(0.05, 1 - friction)} text={frictionLabel} live={live} />
        <MetricChip label="Energy"   ringValue={energyNow} text={`${Math.round(energyNow*100)}%`} live={live} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm"
          onClick={(e)=>{ e.stopPropagation(); openFloqPeek(item.id); }}>
          Peek
        </Button>
        <Button size="sm"
          onClick={(e)=>{ e.stopPropagation(); openPage(); }}>
          Open
        </Button>
      </div>
    </Card>
  );
}