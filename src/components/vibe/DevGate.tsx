import React from 'react';

interface DevGateProps {
  children: React.ReactNode;
}

export function DevGate({ children }: DevGateProps) {
  const [on, setOn] = React.useState(
    import.meta.env.DEV && localStorage.getItem('vibe:devtools:show') === '1'
  );

  React.useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    const handleKeydown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + V
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        const next = !on;
        setOn(next);
        localStorage.setItem('vibe:devtools:show', next ? '1' : '0');
      }
    };
    
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [on]);

  if (!on) return null;
  return <>{children}</>;
}