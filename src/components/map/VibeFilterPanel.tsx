import { useEffect, useState } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  ALL_VIBES,
  type Vibe,
  type VibeFilterState,
} from "@/hooks/useVibeFilter";

interface Props {
  value: VibeFilterState;
  onChange: (v: VibeFilterState) => void;
}

export const VibeFilterPanel = ({ value, onChange }: Props) => {
  const [local, setLocal] = useState(value);

  // sync from parent (Reset, Apply from outside, etc.)
  useEffect(() => setLocal(value), [value]);

  const toggle = (v: Vibe) =>
    setLocal((p) => ({ ...p, [v]: !p[v] }));

  const apply = () => onChange(local);
  const reset = () => {
    const allOn = Object.fromEntries(
      ALL_VIBES.map((v) => [v, true]),
    ) as VibeFilterState;
    setLocal(allOn);
    onChange(allOn);
  };

  const activeCount = ALL_VIBES.filter((v) => !local[v]).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm">
          Filter vibes
          {activeCount > 0 && (
            <span className="ml-2 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-80 sm:w-96">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Vibe filter</h3>
          {activeCount > 0 && (
            <Badge variant="outline">{activeCount} hidden</Badge>
          )}
        </header>

        <div className="space-y-3 overflow-y-auto pr-1">
          {ALL_VIBES.map((v) => (
            <label
              key={v}
              className="flex cursor-pointer items-center gap-3 capitalize"
            >
              <Checkbox
                checked={local[v]}
                onCheckedChange={() => toggle(v)}
              />
              {v}
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
          <Button onClick={apply}>Apply</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};