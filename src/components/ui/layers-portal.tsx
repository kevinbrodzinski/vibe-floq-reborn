import { createPortal } from 'react-dom';

interface LayersPortalProps {
  children: React.ReactNode;
}

export function LayersPortal({ children }: LayersPortalProps) {
  const portalRoot = document.getElementById('layers-portal');
  
  if (!portalRoot) {
    console.warn('Layers portal root not found. Make sure #layers-portal exists in index.html');
    return <>{children}</>;
  }
  
  return createPortal(children, portalRoot);
}