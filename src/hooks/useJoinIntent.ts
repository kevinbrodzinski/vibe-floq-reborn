import { useState, useEffect } from "react";

export type JoinStage = "watch" | "consider" | "commit";

export function useJoinIntent(floqId?: string) {
  const [stage, setStage] = useState<JoinStage>("watch");

  useEffect(() => {
    if (!floqId || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const p = url.searchParams.get("intent");
    if (p === "watch" || p === "consider" || p === "commit") setStage(p);
  }, [floqId]);

  const update = (s: JoinStage) => {
    setStage(s);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("intent", s);
      window.history.replaceState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("floq:intent", { detail: { floqId, stage: s } }));
    }
  };

  const advance = () => {
    const next = stage === "watch" ? "consider" : stage === "consider" ? "commit" : "commit";
    update(next);
  };

  const reset = () => {
    update("watch");
  };

  return { stage, setStage: update, advance, reset };
}