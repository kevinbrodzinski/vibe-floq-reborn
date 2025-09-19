import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFloqsCards } from "@/hooks/useFloqsCards";
import LivingFloqCard, { type LivingFloq } from "@/components/Floqs/cards/LivingFloqCard";
import SearchFilters, { KindFilter, VibeFilter, StatusFilter } from "@/components/Floqs/SearchFilters";

export default function FloqsDiscoverPage() {
  const nav = useNavigate();
  const { data, isLoading } = useFloqsCards();

  // Filters
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [vibe, setVibe] = useState<VibeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  // Actions
  const open = (id: string) => nav(`/floqs/${id}/hq`);
  const primary = (id: string) => console.log("primary", id);
  const secondary = (id: string) => console.log("secondary", id);

  const filterCard = (f: LivingFloq): boolean => {
    // search
    const q = query.trim().toLowerCase();
    if (q) {
      const name = (f.name || "").toLowerCase();
      const desc = (f.description || "").toLowerCase();
      if (!name.includes(q) && !desc.includes(q)) return false;
    }
    // type
    if (kind !== "all" && f.kind !== kind) return false;
    // vibe
    if (vibe !== "all" && (f.vibe || "social").toLowerCase() !== vibe) return false;
    return true;
  };

  // Apply status filter per section
  const sections = useMemo(() => {
    if (!data) return null;
    const apply = (arr: LivingFloq[] = []) => arr.filter(filterCard);
    
    return {
      now:       apply(status==="all" || status==="now" ? (data.now ?? []) : []),
      today:     apply(status==="all" || status==="today" ? (data.today ?? []) : []),
      upcoming:  apply(status==="all" || status==="upcoming" ? (data.upcoming ?? []) : []),
      dormant:   apply(status==="all" || status==="dormant" ? (data.dormant ?? []) : []),
    };
  }, [data, query, kind, vibe, status]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 text-white">
        <div className="glass rounded-xl h-12 animate-pulse mb-4" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} className="glass rounded-2xl h-36 animate-pulse"/>
          ))}
        </div>
      </div>
    );
  }
  if (!data || !sections) return null;

  const Section = ({ title, items }:{title:string; items:LivingFloq[]}) => (
    items.length ? (
      <section className="mb-8">
        <div className="text-sm font-semibold mb-2">{title}</div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(f => (
            <LivingFloqCard key={f.id} data={f} onOpen={open} onPrimary={primary} onSecondary={secondary}/>
          ))}
        </div>
      </section>
    ) : null
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-white">
      {/* Page header */}
      <div className="mb-4">
        <div className="text-lg font-semibold">Floqs</div>
        <div className="text-[12px] text-white/60">Your living social constellation</div>
      </div>

      {/* Restored search + filters (glass) */}
      <SearchFilters
        query={query} onQuery={setQuery}
        kind={kind} onKind={setKind}
        vibe={vibe} onVibe={setVibe}
        status={status} onStatus={setStatus}
      />

      {/* Sections */}
      {status==="all" && <Section title="Converging Now" items={sections.now} />}
      {status==="all" && <Section title="Active Today"   items={sections.today} />}
      {status==="all" && <Section title="Upcoming"       items={sections.upcoming} />}

      {/* Dormant collapsible */}
      {(sections.dormant.length > 0) && status!=="now" && status!=="today" && (
        <details className="mt-2">
          <summary className="text-sm text-white/70 cursor-pointer">Dormant ({sections.dormant.length})</summary>
          <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sections.dormant.map(f => (
              <LivingFloqCard key={f.id} data={f} onOpen={open} onPrimary={primary} onSecondary={secondary}/>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}