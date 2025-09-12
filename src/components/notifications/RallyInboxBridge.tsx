import * as React from 'react';

export function RallyInboxBridge() {
  React.useEffect(() => {
    const onNew = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('New rally thread created:', detail);
      }
    };
    window.addEventListener('floq:rally:inbox:new', onNew as EventListener);
    return () => window.removeEventListener('floq:rally:inbox:new', onNew as EventListener);
  }, []);

  return null;
}