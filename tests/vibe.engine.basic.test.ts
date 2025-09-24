import { evaluate } from "@/core/vibe/VibeEngine";
import type { EngineInputs } from "@/core/vibe/types";

describe('Vibe Engine Basic Tests', () => {
  it("returns sane reading under defaults", () => {
    const r = evaluate({ hour: 18, isWeekend: false } as EngineInputs);
    expect(r.vibe).toBeTruthy();
    expect(r.confidence01).toBeGreaterThan(0);
    expect(r.calcMs).toBeGreaterThanOrEqual(0);
    expect(r.timestamp).toBeGreaterThan(0);
    expect(r.vector).toBeDefined();
    expect(r.components).toBeDefined();
  });

  it("handles weekend vs weekday differently", () => {
    const weekday = evaluate({ hour: 18, isWeekend: false });
    const weekend = evaluate({ hour: 18, isWeekend: true });
    
    // Both should be valid
    expect(weekday.vibe).toBeTruthy();
    expect(weekend.vibe).toBeTruthy();
    expect(weekday.confidence01).toBeGreaterThan(0);
    expect(weekend.confidence01).toBeGreaterThan(0);
  });

  it("performance: evaluates under 80ms", () => {
    const start = performance.now();
    const r = evaluate({ hour: 12, isWeekend: false, speedMps: 1.0, dwellMinutes: 5 });
    const elapsed = performance.now() - start;
    
    expect(elapsed).toBeLessThan(80);
    expect(r.calcMs).toBeLessThan(80);
  });

  it("handles missing optional inputs gracefully", () => {
    const minimal = evaluate({ hour: 12, isWeekend: false });
    expect(minimal.vibe).toBeTruthy();
    expect(minimal.confidence01).toBeGreaterThan(0.3); // Should have reasonable confidence even with minimal data
  });
});