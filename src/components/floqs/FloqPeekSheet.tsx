import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useFloqScores } from "@/hooks/useFloqScores";
import { useFloqsHubData } from "@/hooks/useFloqsHubData";

const PEEK_FALLBACK = {
  id: "__peek_fallback__", name: "Loading", status: "live",
  participants: 0, friends_in: 0, recsys_score: 0.5, energy_now: 0.5, energy_peak: 0.7
} as any;

export function FloqPeekSheet() {
  const [open, setOpen] = React.useState(false);
  const [id, setId] = React.useState<string | null>(null);

  // Event bus (web-safe + SSR guard)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onOpen = (e: Event) => {
      const ce = e as CustomEvent<{ id?: string }>;
      setId(ce.detail?.id ?? null);
      setOpen(true);
    };
    window.addEventListener("floq:peek", onOpen as any);
    return () => window.removeEventListener("floq:peek", onOpen as any);
  }, []);

  // Fast-path fetch from hub cache
  const hub = useFloqsHubData();
  const item =
    hub.momentaryLive.find(x => x.id === id) ??
    hub.tribes.find(x => x.id === id) ??
    hub.publicFloqs.find(x => x.id === id) ??
    hub.discover.find(x => x.id === id);

  // Always call the hook; use safe fallback when item is null
  const scores = useFloqScores((item ?? PEEK_FALLBACK) as any);
  const frictionLabel = scores.friction < 0.25 ? "Low" : scores.friction < 0.6 ? "Moderate" : "High";

  // Actions (wire real implementations later)
  const onJoin   = () => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("floq:action", { detail: { id, action: "join" } }));
  const onFollow = () => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("floq:action", { detail: { id, action: "follow" } }));
  const onShare  = () => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("floq:action", { detail: { id, action: "share" } }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
      <DialogContent className="sm:max-w-lg">
        {item ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2">
                <span className="truncate">{item.name}</span>
                <Badge variant={item.status === "live" ? "default" : "secondary"}>
                  {item.status === "live" ? "Live" : item.status === "upcoming" ? "Starting soon" : "Ended"}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {timeWindowLabel(item)} • {item.participants ?? 0} in{item.friends_in ? ` • ${item.friends_in} friends` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-muted-foreground">Compatibility</div>
              <div className="text-right font-medium">{Math.round(scores.compatibilityPct)}%</div>

              <div className="text-muted-foreground">Friction</div>
              <div className="text-right font-medium">{frictionLabel}</div>

              <div className="text-muted-foreground">Energy</div>
              <div className="text-right font-medium">
                {Math.round(scores.energyNow * 100)}%{scores.peakRatio ? ` • peak ${Math.round(scores.peakRatio * 100)}%` : ""}
              </div>
            </div>

            <Separator className="my-3" />

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" onClick={onShare}>Share</Button>
              <Button variant="outline" onClick={onFollow}>Follow</Button>
              <Button onClick={onJoin}>Join</Button>
            </div>
          </>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function timeWindowLabel(item: any) {
  if (!item.starts_at || !item.ends_at) return "";
  const s = new Date(item.starts_at);
  const e = new Date(item.ends_at);
  const leftM = Math.max(0, Math.round((+e - Date.now()) / 60000));
  const left = leftM >= 60 ? `${Math.floor(leftM/60)} h ${leftM%60} m left` : `${leftM} m left`;
  return `${fmtTime(s)}–${fmtTime(e)} • ${left}`;
}

function fmtTime(d: Date) {
  const h = d.getHours(), m = d.getMinutes().toString().padStart(2, "0");
  const h12 = ((h + 11) % 12) + 1, ap = h >= 12 ? "PM" : "AM";
  return `${h12}:${m} ${ap}`;
}