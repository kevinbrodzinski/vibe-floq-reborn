import * as React from 'react';

export function RallyInboxBridge() {
  React.useEffect(() => {
    const onNew = (e: WindowEventMap['floq:rally:inbox:new']) => {
      if (import.meta.env.DEV) console.log('New rally thread created:', e.detail);
    };
    window.addEventListener('floq:rally:inbox:new', onNew as EventListener);
    return () => window.removeEventListener('floq:rally:inbox:new', onNew as EventListener);
  }, []);
  return null;
}