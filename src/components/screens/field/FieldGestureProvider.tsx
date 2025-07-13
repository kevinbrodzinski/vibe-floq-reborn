import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import type { FieldData } from "./FieldDataProvider";

interface FieldGestureProviderProps {
  data: FieldData;
  children: React.ReactNode;
}

export const FieldGestureProvider = ({ data, children }: FieldGestureProviderProps) => {
  const { mode, setMode, navigate, liveRef, detailsOpen, venuesSheetOpen, selectedVenueId } = useFieldUI();
  const { pathname } = useLocation();

  // ESC key to exit full-screen mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'full') setMode('map');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, setMode]);

  // Haptic feedback on mode change
  useEffect(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(mode === 'full' ? 20 : 10);
    }
  }, [mode]);

  // URL sync effects - only when on Field route
  useEffect(() => {
    if (pathname !== '/') return;
    
    const params = new URLSearchParams(window.location.search);
    if (params.has('full')) setMode('full');
    else if (params.get('view') === 'list') setMode('list');
    else setMode('map');
  }, [pathname, setMode]);

  useEffect(() => {
    // Only manipulate URL when on Field route
    if (pathname !== '/') return;
    
    console.log('[FieldGestureProvider] URL sync effect triggered', { mode, pathname });
    
    const params = new URLSearchParams(window.location.search);
    params.delete('full');
    params.delete('view');

    if (mode === 'full') params.set('full', '1');
    else if (mode === 'list') params.set('view', 'list');

    const newUrl = !params.toString() 
      ? window.location.pathname + window.location.hash 
      : `?${params.toString()}`;
    
    console.log('[FieldGestureProvider] Navigating to:', newUrl);
    navigate(newUrl, { replace: true, preventScrollReset: true });
  }, [pathname, mode, navigate]);

  // Auto-exit full-screen when sheets open - only on Field route
  useEffect(() => {
    if (pathname !== '/') return;
    
    if (mode === 'full' && (detailsOpen || venuesSheetOpen || selectedVenueId)) {
      setMode('map');
    }
  }, [pathname, mode, detailsOpen, venuesSheetOpen, selectedVenueId, setMode]);

  // Live-region accessibility announcements - only on Field route
  useEffect(() => {
    if (pathname !== '/' || !liveRef.current) return;
    
    liveRef.current.textContent =
      mode === 'full' ? 'Entered full-screen map' :
      mode === 'list' ? 'List view' : 'Map view';
  }, [pathname, mode, liveRef]);

  return <>{children}</>;
};