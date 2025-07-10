import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

/**
 * Centralized portal system for proper layer management
 * All transient UI (sheets, popovers, toasts) should mount here
 */

let portalRoot: HTMLElement | null = null;

function getPortalRoot(): HTMLElement {
  if (!portalRoot) {
    portalRoot = document.getElementById('layers-portal');
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = 'layers-portal';
      portalRoot.style.position = 'fixed';
      portalRoot.style.top = '0';
      portalRoot.style.left = '0';
      portalRoot.style.pointerEvents = 'none';
      portalRoot.style.zIndex = '1000'; // High base z-index
      document.body.appendChild(portalRoot);
    }
  }
  return portalRoot;
}

interface LayersPortalProps {
  children: React.ReactNode;
  layer?: 'sheet' | 'popover' | 'toast' | 'modal';
}

export function LayersPortal({ children, layer = 'popover' }: LayersPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const portalRoot = getPortalRoot();
  
  return createPortal(
    <div 
      className={`layers-portal-${layer}`}
      style={{ 
        pointerEvents: 'auto',
        position: 'relative',
        zIndex: layer === 'sheet' ? 60 : 
                layer === 'modal' ? 65 :
                layer === 'toast' ? 70 : 55
      }}
    >
      {children}
    </div>,
    portalRoot
  );
}