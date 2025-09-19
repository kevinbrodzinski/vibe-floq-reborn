import React, { useMemo, useState } from "react";
import Section from "@/components/Common/Section";
import SmartMap from "@/components/Common/SmartMap";
import MeetHalfwaySheet from "./MeetHalfwaySheet";
import { useHQProximity } from "@/hooks/useHQProximity";
import { useHQMeetHalfway } from "@/hooks/useHQMeetHalfway";
import { Events, track } from "@/lib/analytics";
import { openDirections } from "@/lib/nav/openDirections";

type Props = {
  floqId: string;
  reduce?: boolean;
  panelAnim?: (reduce?: boolean) => Record<string, any>;
  onRallyChoice?: (c: "joined" | "maybe" | "declined") => void;
  onMeetHalfway?: () => void;
  meetOpen?: boolean;
};

export default function MapTab({ floqId, reduce, panelAnim = () => ({}), onRallyChoice, onMeetHalfway, meetOpen }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [cats, setCats] = useState<string[]>(["coffee", "bar", "food"]);

  const { data: prox } = useHQProximity(floqId, !!floqId);
  const { data, isLoading } = useHQMeetHalfway(
    floqId,
    { categories: cats, max_km: 3, limit: 8, mode: "walk" },
    !!floqId
  );

  const summary = useMemo(() => {
    if (!data?.candidates?.length) return null;
    const top = data.candidates[0];
    return {
      label: `${Math.min(4, data.candidates.length)} converging at ${top.name}`,
      eta: Math.round(top.avg_eta_min ?? 0),
      alignment: "high",
      energy: "low",
    };
  }, [data]);

  function toggle(cat: string) {
    setCats((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  return (
    <div {...panelAnim(reduce)} className="space-y-5">
      <Section
        title="Living Proximity Map"
        right={
          <button
            onClick={() => {
              track(Events.hq_meet_half_open, { floqId });
              setSheetOpen(true);
            }}
            className="px-3 py-1.5 text-sm rounded-xl bg-white text-black font-medium shadow-[0_0_32px_rgba(129,140,248,.35)]"
          >
            Meet-Halfway
          </button>
        }
      >
        <SmartMap
          data={data ? { centroid: data.centroid, candidates: data.candidates } : prox ? { centroid: prox.centroid, candidates: [] } : undefined}
          selectedId={selected}
          onSelect={setSelected}
          height={300}
        />

        {summary && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-[13px] text-white/90">
            {summary.label} · ETA {summary.eta} • Alignment {summary.alignment} • Energy cost {summary.energy}
            <div className="mt-2 flex gap-2">
              <button
                className="px-3 py-2 rounded-xl bg-white text-black font-medium shadow-[0_0_32px_rgba(168,85,247,.35)]"
                onClick={() => onRallyChoice?.("joined")}
              >
                Join
              </button>
              <button className="px-3 py-2 rounded-xl bg-white/10 text-white/80 border border-white/10" onClick={() => onRallyChoice?.("maybe")}>
                Maybe
              </button>
              <button className="px-3 py-2 rounded-xl bg-white/10 text-white/80 border border-white/10" onClick={() => onRallyChoice?.("declined")}>
                Can't
              </button>
            </div>
          </div>
        )}
      </Section>

      <MeetHalfwaySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        data={data}
        selectedId={selected}
        onSelectVenue={(id) => {
          setSelected(id);
          track(Events.hq_meet_half_select, { floqId, id });
        }}
        categories={cats}
        onToggleCategory={toggle}
        loading={isLoading}
        onNavigate={(id) => {
          const v = data?.candidates.find((c) => c.id === id);
          if (v) openDirections(v.lat, v.lng, v.name);
        }}
        onRallyHere={() => {
          const v = data?.candidates.find((c) => c.id === selected);
          if (v) {
            track(Events.hq_rally_create, { floqId, venueId: v.id, source: "meet_halfway" });
            openDirections(v.lat, v.lng, v.name);
            setSheetOpen(false);
          }
        }}
      />
    </div>
  );
}