import React from "react";
import { useNavigate } from "react-router-dom";
import LivingFloqCard, { type LivingFloq } from "@/components/Floqs/cards/LivingFloqCard";
import { useFloqsCards } from "@/hooks/useFloqsCards";

export default function FloqsDiscoverPage() {
  const nav = useNavigate();
  const { data, isLoading } = useFloqsCards();

  const open = (id: string) => nav(`/floqs/${id}/hq`);
  const primary = (id: string) => {
    // friend: Rally  | club: RSVP       | business: Updates | momentary: Join now
    console.log("primary action for", id);
  };
  const secondary = (id: string) => {
    // friend: Chat   | club: Preview    | business: Navigate | momentary: Ignore
    console.log("secondary action for", id);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 text-white">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} className="glass rounded-2xl h-36 animate-pulse"/>
          ))}
        </div>
      </div>
    );
  }

  const SectionBlock = ({ title, items }:{title:string; items:LivingFloq[]}) => (
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
      <div className="mb-4">
        <div className="text-lg font-semibold">Floqs</div>
        <div className="text-[12px] text-white/60">Your living social constellation</div>
      </div>

      <SectionBlock title="Converging Now" items={data?.now ?? []} />
      <SectionBlock title="Active Today"   items={data?.today ?? []} />
      <SectionBlock title="Upcoming"       items={data?.upcoming ?? []} />
      {/* Optionally collapse dormant */}
      {(data?.dormant?.length ?? 0) > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-white/70 cursor-pointer">Dormant ({data!.dormant!.length})</summary>
          <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data!.dormant!.map(f => (
              <LivingFloqCard key={f.id} data={f} onOpen={open} onPrimary={primary} onSecondary={secondary}/>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}