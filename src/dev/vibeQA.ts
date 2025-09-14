import { evaluate } from "@/core/vibe/VibeEngine";

// Dev shortcut for QA
if (import.meta.env.DEV) {
  (window as any).floq ??= {};
  (window as any).floq.vibeNow = () => {
    const now = new Date();
    const result = evaluate({ 
      hour: now.getHours(), 
      isWeekend: [0,6].includes(now.getDay()),
      speedMps: 0,
      dwellMinutes: 0,
      screenOnRatio01: 0
    });
    console.log("🎵 vibeNow:", result);
    return result;
  };
  
  (window as any).floq.vibeTest = (speedMps = 1.4, dwellMinutes = 25) => {
    const now = new Date();
    const result = evaluate({ 
      hour: 18, 
      isWeekend: true, 
      speedMps, 
      dwellMinutes, 
      screenOnRatio01: 0.1 
    });
    console.log("🎵 vibeTest:", result);
    return result;
  };
}