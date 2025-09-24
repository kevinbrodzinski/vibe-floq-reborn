import * as React from 'react';

type Ctx = {
  topInset: number;
  bottomInset: number;
  setTop: (px: number) => void;
  setBottom: (px: number) => void;
};

const OverlayCtx = React.createContext<Ctx | null>(null);

export function OverlayInsetsProvider({ children }: { children: React.ReactNode }) {
  const [topInset, setTopInset] = React.useState(0);
  const [bottomInset, setBottomInset] = React.useState(0);

  React.useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--field-top-inset', `${topInset}px`);
    r.setProperty('--field-bottom-inset', `${bottomInset}px`);
  }, [topInset, bottomInset]);

  const value = React.useMemo(() => ({
    topInset, bottomInset, setTop: setTopInset, setBottom: setBottomInset,
  }), [topInset, bottomInset]);

  return <OverlayCtx.Provider value={value}>{children}</OverlayCtx.Provider>;
}

export function useOverlayInsets() {
  const ctx = React.useContext(OverlayCtx);
  if (!ctx) throw new Error('useOverlayInsets must be used within OverlayInsetsProvider');
  return ctx;
}