import * as React from "react";
import { MetricCard } from "./MetricCard";
import { useFloqScores } from "@/hooks/useFloqScores";
import type { FloqCardItem } from "@/components/floqs/cards/FloqCard";
import type { AvatarItem } from "@/components/floqs/visual/AvatarStack";
import { openFloqPeek } from "@/lib/peek";

export function MetricsGrid({ item }: { item: FloqCardItem }) {
  const { compatibilityPct, friction, energyNow, peakRatio } = useFloqScores(item);

  const frictionLabel = friction < 0.25 ? "Low" : friction < 0.6 ? "Moderate" : "High";

  // Normalize friend faces to AvatarItem[]
  const allFriends = React.useMemo<AvatarItem[]>(() => {
    if (Array.isArray((item as any).friend_faces)) {
      return (item as any).friend_faces.map((f: any, idx: number) => ({
        id: String(f.id ?? idx),
        name: f.name ?? "",
        imageUrl: f.avatar_url ?? f.imageUrl ?? null,
        floqId: f.floq_id ?? item.id,
      }));
    }
    if (Array.isArray((item as any).friend_avatars)) {
      return (item as any).friend_avatars.map((url: string, idx: number) => ({
        id: String(idx), name: "", imageUrl: url, floqId: item.id,
      }));
    }
    const count = item.friends_in ?? 0;
    return Array.from({ length: Math.min(count, 3) }, (_, idx) => ({
      id: String(idx), name: `Friend ${idx + 1}`, imageUrl: null, floqId: item.id,
    }));
  }, [item]);

  // Split friends across 3 tiles (compat / friction / energy)
  const per = Math.ceil(allFriends.length / 3) || 0;
  const fA = allFriends.slice(0, per);
  const fB = allFriends.slice(per, per * 2);
  const fC = allFriends.slice(per * 2);

  return (
    <div className="grid grid-cols-3 gap-3">
      <MetricCard
        floqId={item.id}
        label="Compatibility"
        ringValue={compatibilityPct / 100}
        bigValueText={`${compatibilityPct}%`}
        subRight={item.participants ? `${item.participants} in` : undefined}
        friends={fA}
        live={item.status === "live"}
        onAvatarPress={(a) => openFloqPeek(a.floqId || item.id)}
      />
      <MetricCard
        floqId={item.id}
        label="Friction"
        ringValue={Math.max(0.05, 1 - friction)}  // invert so "Low friction" looks fuller
        bigValueText={frictionLabel}
        subRight={item.eta_minutes != null ? `${Math.max(0, Math.round(item.eta_minutes))} min ETA` : undefined}
        friends={fB}
        live={item.status === "live"}
        onAvatarPress={(a) => openFloqPeek(a.floqId || item.id)}
      />
      <MetricCard
        floqId={item.id}
        label="Energy"
        ringValue={energyNow}
        bigValueText={`${Math.round(energyNow * 100)}%`}
        subLeft={peakRatio ? `${Math.round(peakRatio * 100)}% of peak` : undefined}
        friends={fC}
        live={item.status === "live"}
        onAvatarPress={(a) => openFloqPeek(a.floqId || item.id)}
      />
    </div>
  );
}