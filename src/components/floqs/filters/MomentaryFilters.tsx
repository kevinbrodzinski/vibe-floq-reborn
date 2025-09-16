import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMomentaryFilters } from "@/hooks/useMomentaryFilters";

export function MomentaryFiltersBar() {
  const { filters, toggleVibe, toggleSmart, setEndsSoon } = useMomentaryFilters();

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition
        ${active ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]" : "bg-secondary text-secondary-foreground"}`}
      aria-pressed={active}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-3 px-2 py-2">
      <div className="flex items-center gap-2">
        <Chip active={filters.vibes.includes("chill")}  onClick={() => toggleVibe("chill")}>Chill</Chip>
        <Chip active={filters.vibes.includes("social")} onClick={() => toggleVibe("social")}>Social</Chip>
        <Chip active={filters.vibes.includes("hype")}   onClick={() => toggleVibe("hype")}>Hype</Chip>
      </div>

      <div className="ml-2 flex items-center gap-2">
        <Chip active={filters.smart.includes("matchVibe")}     onClick={() => toggleSmart("matchVibe")}>Matches my vibe</Chip>
        <Chip active={filters.smart.includes("lowFriction")}   onClick={() => toggleSmart("lowFriction")}>Low friction</Chip>
        <Chip active={filters.smart.includes("buildingEnergy")} onClick={() => toggleSmart("buildingEnergy")}>Building energy</Chip>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Switch id="endsSoon" checked={filters.endsSoon} onCheckedChange={setEndsSoon} />
        <Label htmlFor="endsSoon" className="text-xs text-muted-foreground">Ends soon (≤ 30m)</Label>
      </div>
    </div>
  );
}