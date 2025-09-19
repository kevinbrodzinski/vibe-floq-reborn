import React, { useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

export type KindFilter = "all" | "friend" | "club" | "business" | "momentary";
export type VibeFilter = "all" | "social" | "chill" | "active" | "hype" | "productive" | "quiet";
export type StatusFilter = "all" | "now" | "today" | "upcoming" | "dormant";

type Props = {
  query: string;
  onQuery: (v: string) => void;
  kind: KindFilter;
  onKind: (v: KindFilter) => void;
  vibe: VibeFilter;
  onVibe: (v: VibeFilter) => void;
  status: StatusFilter;
  onStatus: (v: StatusFilter) => void;
};

const chip =
  "px-3 py-1.5 rounded-xl border text-[12px] transition whitespace-nowrap";
const chipOn = `${chip} bg-white/15 border-white/20`;
const chipOff = `${chip} bg-white/5 border-white/10 hover:bg-white/10`;

export default function SearchFilters({
  query, onQuery, kind, onKind, vibe, onVibe, status, onStatus,
}: Props) {
  const kinds: KindFilter[] = ["all","friend","club","business","momentary"];
  const vibes: VibeFilter[] = ["all","social","chill","active","hype","productive","quiet"];
  const statuses: StatusFilter[] = ["all","now","today","upcoming","dormant"];

  const aria = useMemo(() => ({
    search: "Search floqs by name or description",
    kind: "Filter by floq type",
    vibe: "Filter by vibe",
    status: "Filter by activity status",
  }), []);

  return (
    <div className="space-y-3 mb-6">
      {/* Glass search */}
      <label className="block">
        <span className="sr-only">{aria.search}</span>
        <div className="glass rounded-xl px-3 py-2 border border-white/10 flex items-center gap-2">
          <Search className="h-4 w-4 text-white/50" aria-hidden />
          <input
            aria-label={aria.search}
            value={query}
            onChange={(e)=>onQuery(e.target.value)}
            placeholder="Search floqs, vibes, or topics…"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder-white/40"
          />
          <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-[11px] inline-flex items-center gap-1 text-white/70">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Filters
          </div>
        </div>
      </label>

      {/* Calm chips */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[11px] text-white/60 mr-1">Type</div>
        {kinds.map(k => (
          <button
            key={k}
            type="button"
            aria-pressed={kind===k}
            onClick={()=>onKind(k)}
            className={kind===k ? chipOn : chipOff}
          >{k}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[11px] text-white/60 mr-1">Vibe</div>
        {vibes.map(v => (
          <button
            key={v}
            type="button"
            aria-pressed={vibe===v}
            onClick={()=>onVibe(v)}
            className={vibe===v ? chipOn : chipOff}
          >{v}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[11px] text-white/60 mr-1">Status</div>
        {statuses.map(s => (
          <button
            key={s}
            type="button"
            aria-pressed={status===s}
            onClick={()=>onStatus(s)}
            className={status===s ? chipOn : chipOff}
          >{s}</button>
        ))}
      </div>
    </div>
  );
}