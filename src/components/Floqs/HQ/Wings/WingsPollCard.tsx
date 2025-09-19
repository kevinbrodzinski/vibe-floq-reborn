import React from "react";
import Btn from "../ui/Btn";
import { useWingsVote } from "@/hooks/useWingsVote";

type WingsPollPayload = {
  question?: string;
  title?: string;
  options: string[];
  closes_at?: string | null;
};

export function WingsPollCard({
  floqId,
  eventId,
  title,
  payload,
  reason,
}: {
  floqId: string;
  eventId: string;
  title?: string;
  payload: WingsPollPayload;
  reason?: string;
}) {
  const vote = useWingsVote(floqId);
  const [picked, setPicked] = React.useState<number | null>(null);

  const onVote = (i: number) => {
    setPicked(i);
    vote.mutate({ eventId, optionIdx: i });
  };

  return (
    <div className="glass-subtle p-3 rounded-xl border border-white/10">
      <div className="text-white/90 font-medium">{title ?? payload.question ?? "Quick poll"}</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {payload.options.map((opt, i) => (
          <Btn
            key={i}
            size="xs"
            variant={picked === i ? "primary" : "ghost"}
            glow={picked === i}
            className="w-full"
            onClick={() => onVote(i)}
            disabled={vote.isPending}
          >
            {opt}
          </Btn>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-white/50 flex items-center justify-between">
        <span>{reason ?? "Wings suggestion"}</span>
        {payload.closes_at && (
          <span>Closes {new Date(payload.closes_at).toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
}