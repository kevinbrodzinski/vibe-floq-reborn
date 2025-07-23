
import { useMemo, useState } from "react";

/** Must match DB enum values and hue-map keys */
export const ALL_VIBES = [
  "chill",
  "curious", 
  "down",
  "flowing",
  "hype",
  "open",
  "romantic",
  "social",
  "solo",
  "weird",
] as const;

export type Vibe = (typeof ALL_VIBES)[number];

export type VibeFilterState = {
  [K in Vibe]: boolean;
};

const DEFAULT_STATE: VibeFilterState = Object.fromEntries(
  ALL_VIBES.map((v) => [v, true]),
) as VibeFilterState;

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Local-only vibe filter for the map.
 * Returns [state, helpers].
 */
export const useVibeFilter = (
  initial: Partial<VibeFilterState> = {},
): [
  VibeFilterState,
  {
    toggle: (v: Vibe) => void;
    reset: () => void;
    setAll: (on: boolean) => void;
    /** Set from panel "Apply" */
    replace: (next: VibeFilterState) => void;
    /** quick set – ON for exactly these vibes */
    only: (vv: Vibe[]) => void;
    /** derived set of active vibes (fast membership check) */
    activeSet: Set<Vibe>;
    /** At least one vibe switched OFF? */
    isFiltered: boolean;
  },
] => {
  const [state, setState] = useState<VibeFilterState>({
    ...DEFAULT_STATE,
    ...initial,
  });

  /** ⚠️  Stable activeSet - prevents infinite loop in VibeDensityMap */
  const activeSet = useMemo(() => new Set(
    Object.entries(state)
      .filter(([, enabled]) => enabled)
      .map(([v]) => v as Vibe)
  ), [state]);             // ← stable across renders while state unchanged

  const helpers = useMemo(() => {
    const toggle = (v: Vibe) =>
      setState((p) => ({ ...p, [v]: !p[v] }));

    const reset = () => setState(DEFAULT_STATE);

    const setAll = (on: boolean) =>
      setState(
        Object.fromEntries(ALL_VIBES.map((v) => [v, on])) as VibeFilterState,
      );

    const replace = (next: VibeFilterState) => setState(next);

    const only = (vv: Vibe[]) =>
      setState(
        Object.fromEntries(
          ALL_VIBES.map((v) => [v, vv.includes(v)]),
        ) as VibeFilterState,
      );

    const isFiltered = activeSet.size !== 0 && activeSet.size !== ALL_VIBES.length;

    return { toggle, reset, setAll, replace, only, activeSet, isFiltered };
  }, [activeSet]);

  return [state, helpers];
};
