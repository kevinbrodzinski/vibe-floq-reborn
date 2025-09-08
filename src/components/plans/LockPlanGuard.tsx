import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTriggerEval } from "@/hooks/useTriggerEval";
import { supabase } from "@/integrations/supabase/client";

type CandidatePaths = { A: string; B?: string | null; C?: string | null };

export function LockPlanGuard({
  planId,
  activePathId,
  candidatePaths,
  onLocked,
  onApplyRelax,   // (newStart: Date) => void
  onExpandRadius, // (factor: number) => void  e.g. 1.25
  onSuggestSplit, // () => void
}: {
  planId: string;
  activePathId: "A" | "B" | "C";
  candidatePaths: CandidatePaths;
  onLocked: () => void;
  onApplyRelax: (newStart: Date) => void;
  onExpandRadius: (factor: number) => void;
  onSuggestSplit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState<{ omega_G: number; P_G: number; reasons: string[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const triggerEval = useTriggerEval();

  async function handleLock() {
    // Evaluate gate without forcing a switch; high thresholds avoid accidental suggestions
    const res = await triggerEval({
      plan_id: planId,
      active_path_id: activePathId,
      candidate_paths: candidatePaths,
      trigger_rules: { crowdLevel: 101, rainProbPct: 101 },
      weather: null,
    });

    if (res?.gatePass) {
      // Finalize/lock the plan (use your existing finalize-plan edge function or a direct update)
      setSubmitting(true);
      const { error } = await supabase.functions.invoke("finalize-plan", { body: { plan_id: planId } });
      setSubmitting(false);
      if (error) {
        console.error("Finalize error:", error);
        return;
      }
      // Log the lock event (can be expanded later with group_receipts table)
      console.log("Plan locked with gate pass", { omega_G: res.omega_G, P_G: res.P_G, reasons: res.reasons });
      onLocked();
    } else {
      setGate({ omega_G: res?.omega_G ?? 0, P_G: res?.P_G ?? 0, reasons: res?.reasons ?? [] });
      setOpen(true);
    }
  }

  function applyRelax() {
    // Relax time by 30 minutes (caller updates plan draft time or applies new suggestion)
    const newStart = new Date(Date.now() + 30 * 60 * 1000);
    onApplyRelax(newStart);
    setOpen(false);
  }

  function applyRadius() {
    // Expand venue search radius by 25% and re-pull candidates
    onExpandRadius(1.25);
    setOpen(false);
  }

  async function applySplit() {
    onSuggestSplit();
    setOpen(false);
  }

  return (
    <>
      <Button disabled={submitting} onClick={handleLock}>
        {submitting ? "Locking…" : "Lock plan"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Plan not ready to lock</DialogTitle>
          </DialogHeader>

          <Card className="p-4 space-y-2">
            <div className="text-sm text-muted-foreground">
              The predictability gate recommends adjustments before locking.
            </div>
            {gate?.reasons?.length ? (
              <ul className="list-disc pl-5 text-sm">
                {gate.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm">Group stability is low. Consider relaxing constraints or splitting.</div>
            )}
            <div className="text-xs text-muted-foreground">
              omega_G: {gate?.omega_G?.toFixed(2)} • P_G: {gate?.P_G?.toFixed(2)}
            </div>
          </Card>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={applyRelax}>Relax time (+30 min)</Button>
            <Button variant="outline" onClick={applyRadius}>Expand radius (+25%)</Button>
            <Button variant="default" onClick={applySplit}>Suggest subgroup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}