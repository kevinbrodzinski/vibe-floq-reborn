import React from "react";
import { Users, Activity, MapPin, Timer, Rocket, MessageSquare, Navigation2, CalendarClock, Building2, ChevronRight } from "lucide-react";
import { vibeToGradient, energyToWidth } from "./vibeTokens";

export type FloqKind = "friend" | "club" | "business" | "momentary";

export type LivingFloq = {
  id: string;
  name: string;
  description?: string;
  kind: FloqKind;
  vibe?: string;
  members?: number;           // total
  activeNow?: number;         // online/present
  convergenceNearby?: number; // nearby count
  distanceLabel?: string;     // e.g. "0.8 mi"
  energy?: number;            // 0..1
  nextLabel?: string;         // "Dinner @ 7:30"
  nextWhen?: string;          // "Tonight", "Tomorrow 6am"
  ttlSeconds?: number;        // momentary only
  matchPct?: number;          // club discovery
  following?: boolean;        // business/club
  streakWeeks?: number;       // friend floq
};

type Props = {
  data: LivingFloq;
  onOpen: (id: string) => void;
  onPrimary?: (id: string) => void;   // Rally / RSVP / View updates / Join now
  onSecondary?: (id: string) => void; // Chat / Preview / Navigate / Ignore
};

export default function LivingFloqCard({ data, onOpen, onPrimary, onSecondary }: Props) {
  const {
    id, name, description, kind,
    vibe = "social", members = 0, activeNow = 0,
    energy = 0, convergenceNearby = 0, distanceLabel,
    nextLabel, nextWhen, ttlSeconds, matchPct, following, streakWeeks
  } = data;

  const gradient = vibeToGradient(vibe);
  const isMomentary = kind === "momentary";
  const showTTL = isMomentary && typeof ttlSeconds === "number";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(id)}
      onKeyDown={(e)=>{ if (e.key === "Enter" || e.key === " ") onOpen(id); }}
      className="glass rounded-2xl p-4 shadow-glass border border-white/10 hover:bg-white/8 transition group"
    >
      {/* Top row: name + badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white/90 truncate">{name}</div>
          {description && <div className="text-[11px] text-white/60 line-clamp-2">{description}</div>}
        </div>

        <div className="flex items-center gap-2">
          {kind === "friend" && streakWeeks ? (
            <span className="neon-pill px-2 py-0.5 text-[10px]">streak {streakWeeks}w</span>
          ) : null}
          {kind === "club" && typeof matchPct === "number" ? (
            <span className="neon-pill px-2 py-0.5 text-[10px]">{Math.round(matchPct * 100)}% match</span>
          ) : null}
          {kind === "business" && following ? (
            <span className="neon-pill px-2 py-0.5 text-[10px]">following</span>
          ) : null}
          {showTTL ? (
            <div
              aria-label="Time to live"
              className="ttl-ring h-8 w-8 grid place-items-center"
              style={{ ["--ttl-progress" as any]: `${Math.max(0, Math.min(1, ttlSeconds! / 3600)) * 360}deg` }}
            >
              <span className="text-[10px] text-white/85">{Math.max(1, Math.floor(ttlSeconds!/60))}m</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* energy bar */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden" aria-label="Energy level">
        <div className={`h-full bg-gradient-to-r ${gradient}`} style={{ width: energyToWidth(energy) }} />
      </div>

      {/* living indicators */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-white/75">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-white/60" />
          <span>{members} members</span>
          {activeNow > 0 && <span className="ml-1 text-white/60">• {activeNow} active</span>}
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <Activity className="h-3.5 w-3.5 text-white/60" />
          {convergenceNearby > 0 ? (
            <span>{convergenceNearby} converging{distanceLabel ? ` • ${distanceLabel}` : ""}</span>
          ) : <span>calm</span>}
        </div>
      </div>

      {/* Next action */}
      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
        {nextLabel ? (
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-white/85">
              <span className="font-medium">{nextLabel}</span>{nextWhen ? ` • ${nextWhen}` : ""}
            </div>
            <ChevronRight className="h-4 w-4 text-white/60" />
          </div>
        ) : (
          <div className="text-[12px] text-white/60">No upcoming plan — create one?</div>
        )}
      </div>

      {/* Quick actions by kind */}
      <div className="mt-3 flex items-center gap-2">
        {kind === "friend" && (
          <>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); onPrimary?.(id); }}
              className="px-3 py-1.5 rounded-xl border text-[12px] bg-white/6 hover:bg-white/10 ring-neon">
              <span className="inline-flex items-center gap-1"><Rocket className="h-3.5 w-3.5"/><span>Rally</span></span>
            </button>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); onSecondary?.(id); }}
              className="px-3 py-1.5 rounded-xl border text-[12px] bg-white/6 hover:bg-white/10">
              <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5"/><span>Chat</span></span>
            </button>
          </>
        )}

        {kind === "club" && (
          <>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); onPrimary?.(id); }}
              className="px-3 py-1.5 rounded-xl border text-[12px] bg-white/6 hover:bg-white/10 ring-neon">
              <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5"/><span>RSVP</span></span>
            </button>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); onSecondary?.(id); }}
              className="px-3 py-1.5 rounded-xl border text-[12px] bg-white/6 hover:bg-white/10">
              Preview
            </button>
          </>
        )}

        {kind === "business" && (
          <>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); onPrimary?.(id); }}
              className="px-3 py-1.5 rounded-xl border text-[12px] bg-white/6 hover:bg-white/10 ring-neon">
              <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5"/><span>Updates</span></span>
            </button>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); onSecondary?.(id); }}
              className="px-3 py-1.5 rounded-xl border text-[12px] bg-white/6 hover:bg-white/10">
              Navigate
            </button>
          </>
        )}

        {isMomentary && (
          <>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); onPrimary?.(id); }}
              className="px-3 py-1.5 rounded-xl border text-[12px] bg-white/6 hover:bg-white/10 ring-neon">
              Join now
            </button>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); onSecondary?.(id); }}
              className="px-3 py-1.5 rounded-xl border text-[12px] bg-white/6 hover:bg-white/10">
              Ignore
            </button>
          </>
        )}
      </div>
    </article>
  );
}