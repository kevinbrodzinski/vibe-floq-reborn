import { useState, useEffect } from "react";

type JoinStage = "idle" | "consider" | "commit";

export function useJoinIntent(floqId?: string) {
  const [stage, setStage] = useState<JoinStage>("idle");

  useEffect(() => {
    if (!floqId) return;
    
    // Simple intent logic - could be enhanced with ML/analytics
    const stored = localStorage.getItem(`join-intent:${floqId}`);
    if (stored === "commit") {
      setStage("commit");
    } else if (stored === "consider") {
      setStage("consider");
    }
  }, [floqId]);

  const advance = () => {
    if (!floqId) return;
    
    const next = stage === "idle" ? "consider" : stage === "consider" ? "commit" : "commit";
    setStage(next);
    localStorage.setItem(`join-intent:${floqId}`, next);
  };

  const reset = () => {
    if (!floqId) return;
    setStage("idle");
    localStorage.removeItem(`join-intent:${floqId}`);
  };

  return { stage, advance, reset };
}