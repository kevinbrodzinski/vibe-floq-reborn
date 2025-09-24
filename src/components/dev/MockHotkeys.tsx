import * as React from "react";
import { getMockFlag, setMockFlag, useMockRuntimeFlag, initMockFromQueryOnce } from "@/lib/mockFlag";

export function MockHotkeys() {
  // hook ensures reactivity if anyone subscribes later
  useMockRuntimeFlag();

  React.useEffect(() => { initMockFromQueryOnce(); }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ⌘⌥M (Mac) or Ctrl+Alt+M (Win/Linux)
      const isMac = navigator.platform.includes("Mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        const next = !getMockFlag();
        setMockFlag(next);
        // lightweight feedback without extra deps
        if (!import.meta.env.PROD) console.info(`[floqs] mocks ${next ? "ON" : "OFF"}`);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return null;
}