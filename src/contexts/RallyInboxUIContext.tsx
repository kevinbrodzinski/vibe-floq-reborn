import * as React from 'react';

type RallyInboxUIState = {
  isOpen: boolean;
  activeThreadId: string | null;
  open: () => void;
  close: () => void;
  openThread: (threadId: string) => void;
  closeThread: () => void;
};

const Ctx = React.createContext<RallyInboxUIState | null>(null);

export function RallyInboxUIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = React.useState(false);
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(null);

  const open = React.useCallback(() => setOpen(true), []);
  const close = React.useCallback(() => {
    setOpen(false);
    setActiveThreadId(null);
  }, []);
  const openThread = React.useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    setOpen(true);
  }, []);
  const closeThread = React.useCallback(() => setActiveThreadId(null), []);

  const value = React.useMemo<RallyInboxUIState>(
    () => ({ isOpen, activeThreadId, open, close, openThread, closeThread }),
    [isOpen, activeThreadId, open, close, openThread, closeThread]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRallyInboxUI() {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    // Safe fallback — prevents crashes if used outside provider
    return {
      isOpen: false,
      activeThreadId: null,
      open: () => {},
      close: () => {},
      openThread: () => {},
      closeThread: () => {},
    } as RallyInboxUIState;
  }
  return ctx;
}