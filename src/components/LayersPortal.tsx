
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Z } from '@/constants/z';

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
      portalRoot.style.zIndex = String(Z.modal); // Use modal layer as base
      document.body.appendChild(portalRoot);
    }
  }
  return portalRoot;
}

interface LayersPortalProps {
  children: React.ReactNode;
  layer?: 'sheet' | 'popover' | 'toast' | 'modal';
}

const LAYER_Z_INDEX = {
  sheet: Z.modal,
  modal: Z.modal,
  popover: Z.modal - 5, // 65 - slightly below modal
  toast: Z.toast,
} as const;

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
        zIndex: LAYER_Z_INDEX[layer]
      }}
    >
      {children}
    </div>,
    portalRoot
  );
}
