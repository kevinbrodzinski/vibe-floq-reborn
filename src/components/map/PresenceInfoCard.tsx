import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

type PresenceKind = "friend" | "self" | "venue";

export type PresenceSelectPayload = {
  kind: PresenceKind;
  id: string;
  name?: string;
  lngLat?: { lng: number; lat: number };

  // Optional presence signals for friend/self
  energy01?: number;                   // 0..1 current energy
  direction?: "up" | "flat" | "down";  // vibe direction
  etaMin?: number;                     // runway when winding down
  distanceM?: number;                  // distance from me
  venueName?: string;                  // current venue
  openNow?: boolean;

  // Optional visuals
  avatarUrl?: string;
  color?: string;                      // vibe tint e.g. #22d3ee

  // For venue cards
  category?: string;
  rating?: number;
  userRatings?: number;

  // Raw properties if needed
  properties?: Record<string, unknown>;
};

// Export as PresencePayload for compatibility
export type PresencePayload = PresenceSelectPayload;

type Props = {
  onClose?: () => void;
};

/** Util: format distance compact */
const fmtDistance = (m?: number) => {
  if (!m || m <= 0) return "";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
};

/** Util: runway text when winding down */
const runway = (eta?: number) => (eta && eta >= 5 ? `~${Math.round(eta)}m left` : "");

/** Util: direction micro-status */
const vibeStatus = (d?: "up" | "flat" | "down") =>
  d === "up" ? "Building" : d === "down" ? "Winding down" : "Steady";

/** Util: chip color from vibe tint */
const chipStyle = (hex?: string) =>
  ({ background: hex ? hex + "20" : "rgba(255,255,255,.08)", color: hex ?? "#fff" });

/** Event helpers */
const fire = (name: string, detail?: any) =>
  typeof window !== "undefined" && window.dispatchEvent(new CustomEvent(name, { detail }));

/** local event bus subscription */
function usePresenceSelection() {
  const [sel, setSel] = React.useState<PresenceSelectPayload | null>(null);
  React.useEffect(() => {
    const onFriend = (e: Event) => setSel((e as CustomEvent).detail);
    const onVenue = (e: Event) => setSel((e as CustomEvent).detail);
    window.addEventListener("friends:select", onFriend as EventListener);
    window.addEventListener("venues:select", onVenue as EventListener);
    return () => {
      window.removeEventListener("friends:select", onFriend as EventListener);
      window.removeEventListener("venues:select", onVenue as EventListener);
    };
  }, []);
  return { sel, clear: () => setSel(null) };
}

export function PresenceInfoCard({ onClose }: Props) {
  const { sel, clear } = usePresenceSelection();
  const open = !!sel;

  const close = () => {
    clear();
    onClose?.();
  };

  const primaryColor = sel?.color ?? "hsl(var(--primary))";
  const isFriend = sel?.kind === "friend";
  const isSelf = sel?.kind === "self";
  const isVenue = sel?.kind === "venue";

  // ---- Actions (wired to your app events) ----
  const act = {
    ping: () => fire("floq:ping", { id: sel?.id }),
    message: () => fire("floq:message", { id: sel?.id }),
    invite: () => fire("floq:invite", { id: sel?.id, to: sel?.lngLat }),
    flowTo: () => fire("floq:navigate", { to: sel?.lngLat, label: sel?.name }),
    saveVenue: () => fire("floq:save_venue", { id: sel?.id }),
    peakTimes: () => fire("floq:venue_peaks", { id: sel?.id }),
    shareLive: () => fire("floq:share_live", { id: sel?.id }),
    setMeetHere: () => fire("floq:set_meet_here", { at: sel?.lngLat, label: sel?.name }),
    recenter: () => {
      fire("floq:geolocate");
      close();
    },
    convergeModal: () =>
      fire("converge:open", { peer: sel, anchor: sel?.lngLat ?? null }),
  };

  const Now = (
    <div className="flex items-center gap-2">
      {/* vibe chip */}
      {isFriend || isSelf ? (
        <span
          style={chipStyle(sel?.color)}
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          title="Current vibe"
        >
          {vibeStatus(sel?.direction)}
        </span>
      ) : null}

      {/* direction bar */}
      {(isFriend || isSelf) && (
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-20 rounded-full overflow-hidden bg-white/10">
            <div
              className={`h-full ${sel?.direction === "up" ? "bg-emerald-400" :
                sel?.direction === "down" ? "bg-rose-400" : "bg-sky-400"}`}
              style={{ width: `${Math.round((sel?.energy01 ?? 0) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-white/70">
            {sel?.direction === "up" ? "↑" : sel?.direction === "down" ? "↓" : "→"}
          </span>
        </div>
      )}

      {/* runway chip */}
      {sel?.direction === "down" && sel?.etaMin && sel.etaMin >= 5 && (
        <span className="px-2 py-0.5 rounded-full text-xs bg-white/8 text-white/80">
          {runway(sel.etaMin)}
        </span>
      )}
    </div>
  );

  const Next = (
    <div className="text-xs text-white/70">
      {isFriend || isSelf
        ? sel?.properties?.nextLabel
          ? `Next: ${sel.properties.nextLabel}`
          : "Open to converge"
        : isVenue
        ? (sel?.openNow ? "Open now" : "Currently closed")
        : ""}
    </div>
  );

  const Where = (
    <div className="text-xs text-white/80 flex items-center gap-2">
      {sel?.venueName && (
        <span className="px-1.5 py-0.5 rounded bg-white/8">{sel.venueName}</span>
      )}
      {sel?.distanceM != null && <span>{fmtDistance(sel.distanceM)}</span>}
    </div>
  );

  const PrimaryCTA = () => {
    if (isVenue) return (
      <button className="px-3 h-9 rounded-lg bg-white text-black font-medium hover:bg-white/90" onClick={act.flowTo}>Flow to</button>
    );
    if (isSelf) return (
      <button className="px-3 h-9 rounded-lg bg-white text-black font-medium hover:bg-white/90" onClick={act.recenter}>Recenter</button>
    );
    return <button className="px-3 h-9 rounded-lg bg-white text-black font-medium hover:bg-white/90" onClick={act.convergeModal}>Check convergence</button>;
  };

  const SecondaryCTAs = () => (
    <>
      {isFriend && (
        <>
          <button className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10" onClick={act.ping}>Ping</button>
          <button className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10" onClick={act.message}>Message</button>
        </>
      )}
      {isVenue && (
        <>
          <button className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10" onClick={act.invite}>Invite</button>
          <button className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10" onClick={act.saveVenue}>Save</button>
        </>
      )}
      {isSelf && (
        <>
          <button className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10" onClick={act.shareLive}>Share live</button>
          <button className="px-3 h-9 rounded-lg bg-white/6 text-white hover:bg-white/10" onClick={act.setMeetHere}>Set meet here</button>
        </>
      )}
    </>
  );



  return (
    <AnimatePresence>
      {open && sel && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed left-0 right-0 bottom-0 z-[70] px-3 pb-3 pointer-events-none"
        >
          <div className="mx-auto w-full max-w-md rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-lg pointer-events-auto">
            {/* header */}
            <div className="flex gap-3 p-3">
              {/* avatar / glyph */}
              <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/20">
                {isVenue ? (
                  <div className="w-full h-full grid place-items-center bg-white/5">🏁</div>
                ) : sel.avatarUrl ? (
                  <img src={sel.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center bg-white/5">🧭</div>
                )}
              </div>

              {/* title & meta */}
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <div className="font-semibold truncate text-white">{sel.name ?? (isSelf ? "You" : isVenue ? "Venue" : "Friend")}</div>
                  {isVenue && sel.category && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-white/8 text-white/80">{sel.category}</span>
                  )}
                </div>
                
                {/* Now → Next → Where layout */}
                <div className="mt-2 space-y-1">
                  {/* Now row */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/60">Now</div>
                    <div className="flex-1 ml-2">{Now}</div>
                  </div>
                  
                  {/* Next row */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/60">Next</div>
                    <div className="flex-1 ml-2">{Next}</div>
                  </div>
                  
                  {/* Where row */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/60">Where</div>
                    <div className="flex-1 ml-2">{Where}</div>
                  </div>
                </div>
              </div>

              {/* close */}
              <button className="ml-1 text-white/60 hover:text-white" onClick={close} aria-label="Close">✕</button>
            </div>

            {/* actions */}
            <div className="px-3 pb-3 flex items-center gap-2">
              <PrimaryCTA />
              <div className="flex items-center gap-1 ml-auto">
                <SecondaryCTAs />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
