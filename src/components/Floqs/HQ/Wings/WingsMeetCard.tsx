import React from "react";
import Btn from "../ui/Btn";
import { useRallyCreate } from "@/hooks/useRallyCreate";

type Candidate = { id?: string; name: string; eta_hint?: string };
type Payload = { candidates: Candidate[]; scope?: "floq"|"field"; note?: string; window?: string };

export function WingsMeetCard({
  floqId, title, payload, reason
}: { floqId: string; title?: string; payload: Payload; reason?: string }) {
  const rallyCreate = useRallyCreate(floqId);

  return (
    <div className="glass-subtle p-3 rounded-xl border border-white/10">
      <div className="text-white/90 font-medium">{title ?? "Meet halfway?"}</div>
      <div className="text-[12px] text-white/60 mt-1">
        Suggested meeting spots {payload.window ? `within ${payload.window}` : ""}
      </div>

      <div className="mt-2 grid gap-2">
        {(payload.candidates ?? []).slice(0, 3).map((v, i) => (
          <div key={`${v.id ?? v.name}-${i}`}
               className="rounded-xl border border-white/10 p-2 flex items-center justify-between">
            <div className="text-white/85">
              {v.name} {v.eta_hint ? <span className="text-white/60 text-xs">• {v.eta_hint}</span> : null}
            </div>
            <Btn size="xs" variant="primary" glow
                 onClick={() => rallyCreate.mutate({ venueId: v.id, scope: payload.scope ?? "floq", note: payload.note })}
                 disabled={rallyCreate.isPending}>
              Rally Here
            </Btn>
          </div>
        ))}
      </div>

      <div className="mt-2 text-[11px] text-white/50">{reason ?? "Wings detected proximity"}</div>
    </div>
  );
}