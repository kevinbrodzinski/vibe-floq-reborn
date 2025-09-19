import React, { useMemo, useState } from "react";
import Btn from "../ui/Btn";
import { useWingsTally } from "@/hooks/useWingsTally";
import { useWingsVote } from "@/hooks/useWingsVote";

/**
 * Minimal poll payload: { question?:string; title?:string; options: string[]; closes_at?: string|null }
 */
type WingsPollPayload = { question?: string; title?: string; options: string[]; closes_at?: string | null };

export function WingsPollCard({
  floqId, eventId, title, payload, reason
}: {
  floqId: string; eventId: string; title?: string; payload: WingsPollPayload; reason?: string;
}) {
  const tally = useWingsTally(eventId);
  const vote = useWingsVote(floqId, eventId);
  const [picked, setPicked] = useState<number | null>(null);

  const counts = tally.data ?? [];
  const total = useMemo(() => counts.reduce((s, r) => s + r.votes, 0), [counts]);

  const getVotes = (idx: number) => counts.find(c => c.option_idx === idx)?.votes ?? 0;
  const getPct = (idx: number) => total > 0 ? Math.round((getVotes(idx) / total) * 100) : 0;

  return (
    <div className="glass-subtle p-3 rounded-xl border border-white/10">
      <div className="text-white/90 font-medium">{title ?? payload.question ?? "Quick poll"}</div>

      <div className="mt-2 grid gap-2">
        {payload.options.map((opt, idx) => {
          const pct = getPct(idx);
          const isSelected = picked === idx;
          return (
            <div key={idx} className="rounded-xl border border-white/10 p-2">
              {/* bar */}
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background:
                      "linear-gradient(90deg, rgba(139,92,246,.55), rgba(6,182,212,.45))"
                  }}
                />
              </div>
              {/* label + numbers */}
              <div className="mt-1 flex items-center justify-between text-[12px] text-white/75">
                <span className="truncate">{opt}</span>
                <span className="font-mono">{total > 0 ? `${pct}% · ${getVotes(idx)}` : "0%"}</span>
              </div>

              {/* vote button */}
              <div className="mt-2">
                <Btn
                  size="xs"
                  variant={isSelected ? "primary" : "ghost"}
                  glow={isSelected}
                  className="w-full"
                  disabled={vote.isPending}
                  onClick={() => { setPicked(idx); vote.mutate(idx); }}
                >
                  {isSelected ? "Voted" : "Vote"}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-[11px] text-white/50 flex items-center justify-between">
        <span>{reason ?? "Wings suggestion"}</span>
        {payload.closes_at && <span>Closes {new Date(payload.closes_at).toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}