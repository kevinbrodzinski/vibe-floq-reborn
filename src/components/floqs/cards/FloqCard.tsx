import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFloqScores } from "@/hooks/useFloqScores";
import { openFloqPeek } from "@/lib/peek";

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
  const { compatibilityPct, friction, energyNow, peakRatio } = useFloqScores(item);
  
  const displayName = item.name || item.title || "Untitled";
  const participantCount = item.participants ?? item.participant_count ?? 0;

  const onOpen = () => openFloqPeek(item.id);

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
        <p>Friction {Math.round(friction * 100) / 100}</p>
        <p>Energy {Math.round(energyNow * 100)}% {peakRatio ? `(peak ${Math.round(peakRatio * 100)}%)` : ""}</p>
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground flex items-center justify-between">
        <span>{participantCount} in</span>
        {item.friends_in ? <span>{item.friends_in} friends</span> : <span />}
      </CardFooter>
    </Card>
  );
}