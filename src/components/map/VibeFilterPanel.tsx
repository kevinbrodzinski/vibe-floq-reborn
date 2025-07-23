import { useState, useEffect } from "react";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** slider-bias preset −1‥+1 for every vibe we currently support */
export const defaultPrefs = {
  hype: 0,
  chill: 0,
  social: 0,
  curious: 0,
  flowing: 0,
  solo: 0,
  romantic: 0,
  weird: 0,
  down: 0,
  open: 0,
} as const;

export type VibePrefs = Record<keyof typeof defaultPrefs, number>;

interface Props {
  value: VibePrefs;
  onChange: (v: VibePrefs) => void;
}

export const VibeFilterPanel = ({ value, onChange }: Props) => {
  const [local, setLocal] = useState<VibePrefs>(value);

  /* when parent updates its prefs (eg. Reset), sync the sheet */
  useEffect(() => setLocal(value), [value]);

  const set = (k: keyof VibePrefs, v: number[]) =>
    setLocal((p) => ({ ...p, [k]: v[0] }));

  const apply  = () => onChange(local);
  const reset  = () => { onChange(defaultPrefs); setLocal(defaultPrefs); };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm">
          Filter vibes
        </Button>
      </SheetTrigger>

      <SheetContent className="w-80 sm:w-96">
        <h3 className="mb-4 text-lg font-semibold">Vibe filter</h3>

        <div className="space-y-6 overflow-y-auto pr-2">
          {(Object.keys(defaultPrefs) as Array<keyof VibePrefs>).map((vibe) => (
            <div key={vibe}>
              <div className="mb-1 flex items-center justify-between">
                <span className="capitalize">{vibe}</span>
                {local[vibe] !== 0 && (
                  <Badge variant="outline">
                    {local[vibe] > 0 ? "+" : ""}
                    {local[vibe].toFixed(1)}
                  </Badge>
                )}
              </div>

              <Slider
                value={[local[vibe]]}
                min={-1}
                max={1}
                step={0.1}
                onValueChange={(val) => set(vibe, val)}
              />
            </div>
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