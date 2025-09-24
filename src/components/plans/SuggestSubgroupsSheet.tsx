import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type Group = { label: string; members: string[]; cohesion: number };
type Props = {
  planId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApplySplit: (groups: Group[]) => Promise<void>; // implement: fork plans/invites
  renderMember?: (profile_id: string) => React.ReactNode; // chip renderer
};

export function SuggestSubgroupsSheet({ planId, open, onOpenChange, onApplySplit, renderMember }: Props) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);

  async function fetchSuggestion() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("suggest-subgroups", { body: { plan_id: planId } });
    setLoading(false);
    if (error) {
      console.error("suggest-subgroups error", error);
      return;
    }
    setGroups(data?.groups ?? null);
    setReasons(data?.reasons ?? []);
  }

  React.useEffect(() => {
    if (open) fetchSuggestion();
  }, [open]);

  const disabled = loading || !groups?.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Suggested subgroups</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Computing best split…</div>}

          {groups?.map((g, idx) => (
            <Card key={idx} className="p-3">
              <div className="mb-2 text-sm font-medium">{g.label} • cohesion {g.cohesion.toFixed(2)}</div>
              <div className="flex flex-wrap gap-2">
                {g.members.map(m => (
                  <span key={m} className="inline-flex items-center px-2 py-1 rounded bg-secondary/50 text-sm">
                    {renderMember ? renderMember(m) : m.slice(0,8)}
                  </span>
                ))}
              </div>
            </Card>
          ))}

          {!!reasons.length && (
            <div className="text-xs text-muted-foreground">
              Based on: {reasons.join(" · ")}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={disabled} onClick={() => groups && onApplySplit(groups)}>Apply split</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}