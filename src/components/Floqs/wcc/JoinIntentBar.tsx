import * as React from "react";
import { useJoinIntent } from "@/hooks/useJoinIntent";

export function JoinIntentBar({ floqId }: { floqId: string }) {
  const { stage, setStage } = useJoinIntent(floqId);
  const Step = ({ s, label }: { s: "watch"|"consider"|"commit"; label: string }) => {
    const active = stage === s;
    return (
      <button
        type="button"
        onClick={() => setStage(s)}
        className={`rounded-full px-3 py-1 text-xs transition
          ${active ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]" : "bg-secondary text-secondary-foreground"}`}
        aria-pressed={active}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-background/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Step s="watch"    label="Watch" />
        <Step s="consider" label="Consider" />
        <Step s="commit"   label="Commit" />
      </div>
      {/* Privacy notice when not committed */}
      {stage !== "commit" && (
        <div className="text-xs text-muted-foreground">
          You appear <span className="font-medium">anonymous</span> to others until you commit.
        </div>
      )}
    </div>
  );
}