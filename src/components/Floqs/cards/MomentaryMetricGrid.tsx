import * as React from "react";
import { MetricCard } from "./MetricCard";
import { AvatarItem } from "../visual/AvatarStack";
import { useFloqScores } from "@/hooks/useFloqScores";
import type { FloqCardItem } from "./FloqCard";

export interface MomentaryMetricItem extends FloqCardItem {
  starts_at: string;
  ends_at: string;
  cohesion?: number;
  friend_faces?: Array<{ id: string; name: string; avatar_url?: string | null; floq_id?: string | null }>;
  friend_avatars?: string[];
}

export function MomentaryMetricGrid({ item }: { item: MomentaryMetricItem }) {
  const scores = useFloqScores(item);
  
  // Normalize friends data
  const friends: AvatarItem[] = React.useMemo(() => {
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
    if (item.friends_in && item.friends_in > 0) {
      return Array.from({ length: Math.min(item.friends_in, 3) }, (_, idx) => ({
        id: String(idx),
        name: `Friend ${idx + 1}`,
        imageUrl: null,
        floqId: null,
      }));
    }
    return [];
  }, [item]);

  // Split friends across the 3 cards
  const friendsPerCard = Math.ceil(friends.length / 3);
  const compatibilityFriends = friends.slice(0, friendsPerCard);
  const frictionFriends = friends.slice(friendsPerCard, friendsPerCard * 2);
  const energyFriends = friends.slice(friendsPerCard * 2);

  return (
    <div className="space-y-3">
      {/* Floq title */}
      <div className="px-2">
        <h3 className="text-lg font-semibold text-foreground">
          {item.name || item.title || "Unnamed Floq"}
        </h3>
      </div>

      {/* 3-card metric grid */}
      <div className="grid grid-cols-3 gap-2 px-2">
        <MetricCard
          type="compatibility"
          value={3.4}
          percentage={scores.compatibilityPct}
          count={53}
          friends={compatibilityFriends}
          floqId={item.id}
        />
        <MetricCard
          type="friction"
          value={5.3}
          percentage={Math.round((1 - scores.friction) * 100)} // Invert friction for display
          count={57}
          friends={frictionFriends}
          floqId={item.id}
        />
        <MetricCard
          type="energy"
          value={3.6}
          percentage={Math.round(scores.energyNow * 100)}
          count={93}
          friends={energyFriends}
          floqId={item.id}
        />
      </div>
    </div>
  );
}