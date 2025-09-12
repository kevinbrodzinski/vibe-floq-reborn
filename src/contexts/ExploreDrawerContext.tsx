import * as React from 'react';

type ExploreDrawerState = {
  isOpen: boolean;
  setOpen: (next: boolean) => void;
};

const ExploreDrawerCtx = React.createContext<ExploreDrawerState | null>(null);

export function ExploreDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = React.useState(false);

  const value = React.useMemo(() => ({ isOpen, setOpen }), [isOpen]);
  return <ExploreDrawerCtx.Provider value={value}>{children}</ExploreDrawerCtx.Provider>;
}

export function useExploreDrawer() {
  const ctx = React.useContext(ExploreDrawerCtx);
  if (!ctx) {
    // Safe fallback so we never crash if used outside provider
    return { isOpen: false, setOpen: () => {} } as ExploreDrawerState;
  }
  return ctx;
}