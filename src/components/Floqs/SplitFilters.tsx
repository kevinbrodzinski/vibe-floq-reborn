import React, { useRef, useState, useEffect } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";

export type KindFilter = "all" | "friend" | "club" | "business" | "momentary";
export type VibeFilter = "all" | "social" | "chill" | "active" | "hype" | "productive" | "quiet";
export type StatusFilter = "all" | "now" | "today" | "upcoming" | "dormant";

type Props = {
  query: string;
  onQuery: (v: string) => void;
  kind: KindFilter;   onKind: (v: KindFilter) => void;
  vibe: VibeFilter;   onVibe: (v: VibeFilter) => void;
  status: StatusFilter; onStatus: (v: StatusFilter) => void;
};

const btn = "px-3 py-1.5 rounded-xl border text-[12px] bg-white/5 border-white/10 hover:bg-white/10 inline-flex items-center gap-1 transition-all duration-200";
const pop = "absolute z-30 mt-2 glass rounded-xl p-2 border border-white/10 shadow-glass min-w-[220px]";

export default function SplitFilters({ query, onQuery, kind, onKind, vibe, onVibe, status, onStatus }: Props) {
  const [open, setOpen] = useState<null | "kind" | "vibe" | "status">(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="space-y-3">
      {/* Glass search */}
      <label className="block">
        <div className="glass rounded-xl px-3 py-2 border border-white/10 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-white/50" aria-hidden />
          <input
            aria-label="Search floqs"
            value={query}
            onChange={(e)=>onQuery(e.target.value)}
            placeholder="Search floqs, vibes, or topics…"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder-white/40"
          />
        </div>
      </label>

      {/* Three compact buttons */}
      <div className="relative flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            aria-expanded={open==='kind'}
            className={btn}
            onClick={()=>setOpen(open==='kind'?null:'kind')}
          >
            Type <ChevronDown className="h-3.5 w-3.5"/>
          </button>
          {open==='kind' && (
            <div role="menu" className={pop}>
              {(["all","friend","club","business","momentary"] as KindFilter[]).map(k=>(
                <button key={k} role="menuitem" className={`${btn} w-full justify-between ${k===kind?"bg-white/15 border-white/20":"bg-transparent hover:bg-white/5"}`} onClick={()=>{onKind(k); setOpen(null);}}>
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-expanded={open==='vibe'}
            className={btn}
            onClick={()=>setOpen(open==='vibe'?null:'vibe')}
          >
            Vibe <ChevronDown className="h-3.5 w-3.5"/>
          </button>
          {open==='vibe' && (
            <div role="menu" className={pop}>
              {(["all","social","chill","active","hype","productive","quiet"] as VibeFilter[]).map(v=>(
                <button key={v} role="menuitem" className={`${btn} w-full justify-between ${v===vibe?"bg-white/15 border-white/20":"bg-transparent hover:bg-white/5"}`} onClick={()=>{onVibe(v); setOpen(null);}}>
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-expanded={open==='status'}
            className={btn}
            onClick={()=>setOpen(open==='status'?null:'status')}
          >
            Status <ChevronDown className="h-3.5 w-3.5"/>
          </button>
          {open==='status' && (
            <div role="menu" className={pop}>
              {(["all","now","today","upcoming","dormant"] as StatusFilter[]).map(s=>(
                <button key={s} role="menuitem" className={`${btn} w-full justify-between ${s===status?"bg-white/15 border-white/20":"bg-transparent hover:bg-white/5"}`} onClick={()=>{onStatus(s); setOpen(null);}}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}