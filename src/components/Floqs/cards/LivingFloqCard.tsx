import React from "react";
import {
  Users, Activity, Rocket, MessageSquare, Navigation2,
  CalendarClock, Building2, ChevronRight
} from "lucide-react";
import { vibeToGradient, energyToWidth } from "./vibeTokens";

export type FloqKind = "friend"|"club"|"business"|"momentary";

export type LivingFloq = {
  id: string;
  name: string;
  description?: string;
  kind: FloqKind;
  vibe?: string;
  totalMembers?: number;
  activeMembers?: number;
  convergenceNearby?: number;
  distanceLabel?: string;
  energy?: number;
  nextPlanId?: string;                 // for RSVP linking
  nextLabel?: string;
  nextWhen?: string;
  ttlSeconds?: number;
  matchPct?: number;
  following?: boolean;
  streakWeeks?: number;
  rallyNow?: boolean;
  forming?: boolean;
  lastActiveAgo?: string;
};

type Props = {
  data: LivingFloq;
  onOpen: (id: string) => void;
  onRally?: (id: string) => void;     // Rally for all floqs
  onRSVP?: (id: string, planId: string) => void; // RSVP when plan exists
  onChat?: (id: string) => void;      // Chat for all floqs
};

function membersLine(total?: number, active?: number) {
  const t = total ?? 0, a = active ?? 0;
  if (t <= 0) return "0 members";
  return a > 0 ? `${t} members • ${a} active` : `${t} members`;
}
function activityLabel(opts:{rally?:boolean; forming?:boolean; nextLabel?:string; nextWhen?:string; lastActiveAgo?:string;}) {
  const { rally, forming, nextLabel, nextWhen, lastActiveAgo } = opts;
  if (rally) return "Rally happening now";
  if (forming) return "Rally forming";
  if (nextLabel) return nextWhen ? `${nextLabel} • ${nextWhen}` : nextLabel;
  if (lastActiveAgo) return `Last active: ${lastActiveAgo}`;
  return "Calm";
}

export default function LivingFloqCard({ data, onOpen, onRally, onRSVP, onChat }: Props) {
  const {
    id, name, description, kind,
    vibe = "social",
    totalMembers = 0, activeMembers = 0,
    energy = 0.35, convergenceNearby = 0, distanceLabel,
    nextPlanId, nextLabel, nextWhen, ttlSeconds, matchPct, following, streakWeeks,
    rallyNow, forming, lastActiveAgo
  } = data;

  const gradient = vibeToGradient(vibe);
  const isMomentary = kind === "momentary";
  const showTTL = isMomentary && typeof ttlSeconds === "number";

  const headerLine = membersLine(totalMembers, activeMembers);
  const subline = activityLabel({ rally: rallyNow, forming, nextLabel, nextWhen, lastActiveAgo });
  const dormant = !rallyNow && !forming && !nextLabel && activeMembers === 0 && energy <= 0.2;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(id)}
      onKeyDown={(e)=>{ if (e.key === "Enter" || e.key === " ") onOpen(id); }}
      className={`glass rounded-2xl p-4 shadow-glass border border-white/10 hover:bg-white/8 transition group ${dormant ? "opacity-75" : ""}`}
    >
      {/* Title/Badges */}
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
          {showTTL && (
            <div
              aria-label="time remaining"
              className="ttl-ring h-8 w-8 grid place-items-center"
              style={{ ["--ttl-progress" as any]: `${Math.max(0, Math.min(1, ttlSeconds!/3600)) * 360}deg` }}
            >
              <span className="text-[10px] text-white/85">{Math.max(1, Math.floor(ttlSeconds!/60))}m</span>
            </div>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="mt-2 text-[11px] text-white/70">{headerLine}</div>

      {/* Energy — calm breathing; disabled under prefers-reduced-motion */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden energy-breathe" aria-label="energy">
        <div className={`h-full bg-gradient-to-r ${gradient}`} style={{ width: energyToWidth(energy) }} />
      </div>

      {/* Indicators */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-white/75">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-white/60" />
          <span className={rallyNow || forming ? "text-white/90" : ""}>{subline}</span>
        </div>
        <div className="flex items-center justify-end gap-1.5">
          {convergenceNearby > 0 ? (
            <span>{convergenceNearby} converging{distanceLabel ? ` • ${distanceLabel}` : ""}</span>
          ) : <span>calm</span>}
        </div>
      </div>

      {/* Next action */}
      <div className={`mt-3 rounded-xl border border-white/10 bg-white/5 p-3 ${rallyNow || forming ? "pulse-aura" : ""}`}>
        {nextLabel ? (
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-white/85">
              <span className="font-medium">{nextLabel}</span>{nextWhen ? ` • ${nextWhen}` : ""}
            </div>
            <ChevronRight className="h-4 w-4 text-white/60" />
          </div>
        ) : (
          <div className="text-[12px] text-white/60">{dormant ? (lastActiveAgo ? `Last active: ${lastActiveAgo}` : "Dormant") : "No upcoming plan — create one?"}</div>
        )}
      </div>

      {/* Quick actions - Universal Rally + Chat, conditional RSVP */}
      <div className="mt-3 flex items-center gap-2 text-[12px]">
        {/* Rally button - always visible except momentary */}
        {!isMomentary && (
          <button type="button" onClick={(e)=>{ e.stopPropagation(); onRally?.(id); }}
            className="px-3 py-1.5 rounded-xl border bg-white/6 hover:bg-white/10 ring-neon">
            Rally
          </button>
        )}
        
        {/* RSVP button - only when plan exists */}
        {nextPlanId && (
          <button type="button" onClick={(e)=>{ e.stopPropagation(); onRSVP?.(id, nextPlanId); }}
            className="px-3 py-1.5 rounded-xl border bg-white/6 hover:bg-white/10 ring-neon">
            RSVP
          </button>
        )}
        
        {/* Chat button - always visible except momentary */}
        {!isMomentary && (
          <button type="button" onClick={(e)=>{ e.stopPropagation(); onChat?.(id); }}
            className="px-3 py-1.5 rounded-xl border bg-white/6 hover:bg-white/10">
            Chat
          </button>
        )}
        
        {/* Momentary-specific actions */}
        {isMomentary && (
          <>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); onRally?.(id); }}
              className="px-3 py-1.5 rounded-xl border bg-white/6 hover:bg-white/10 ring-neon">
              Join now
            </button>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); /* ignore action */ }}
              className="px-3 py-1.5 rounded-xl border bg-white/6 hover:bg-white/10">
              Ignore
            </button>
          </>
        )}
      </div>
    </article>
  );
}