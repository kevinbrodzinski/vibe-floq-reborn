import React from "react";
import Btn from "../ui/Btn";
import { useWingsVote } from "@/hooks/useWingsVote";

type Payload = { title?: string; slots: string[]; tz?: string; closes_at?: string | null };

export function WingsTimeCard({
  floqId, eventId, title, payload, reason
}: { floqId: string; eventId: string; title?: string; payload: Payload; reason?: string }) {
  const vote = useWingsVote(floqId, eventId);

  return (
    <div className="glass-subtle p-3 rounded-xl border border-white/10">
      <div className="text-white/90 font-medium">{title ?? payload.title ?? "What time works?"}</div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {(payload.slots ?? ["7:00","7:30","8:00"]).map((slot, idx) => (
          <Btn key={slot} size="xs" onClick={() => vote.mutate(idx)} disabled={vote.isPending}>
            {slot}
          </Btn>
        ))}
      </div>

      <div className="mt-2 text-[11px] text-white/50 flex items-center justify-between">
        <span>{reason ?? "Wings suggestion"}</span>
        {payload.tz ? <span>Times in {payload.tz}</span> : null}
      </div>
    </div>
  );
}