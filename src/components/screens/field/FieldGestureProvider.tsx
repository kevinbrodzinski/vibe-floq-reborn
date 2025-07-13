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

  // URL sync effects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('full')) setMode('full');
    else if (params.get('view') === 'list') setMode('list');
    else setMode('map');
  }, [setMode]);

  useEffect(() => {
    // Only manipulate URL when on Field route
    if (pathname !== '/') return;
    
    const params = new URLSearchParams(window.location.search);
    params.delete('full');
    params.delete('view');

    if (mode === 'full') params.set('full', '1');
    else if (mode === 'list') params.set('view', 'list');

    if (!params.toString()) {
      navigate(window.location.pathname + window.location.hash, { replace: true });
    } else {
      navigate(`?${params.toString()}`, { replace: true, preventScrollReset: true });
    }
  }, [pathname, mode, navigate]);

  // Auto-exit full-screen when sheets open
  useEffect(() => {
    if (mode === 'full' && (detailsOpen || venuesSheetOpen || selectedVenueId)) {
      setMode('map');
    }
  }, [mode, detailsOpen, venuesSheetOpen, selectedVenueId, setMode]);

  // Live-region accessibility announcements
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.textContent =
        mode === 'full' ? 'Entered full-screen map' :
        mode === 'list' ? 'List view' : 'Map view';
    }
  }, [mode, liveRef]);

  // Back-forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has('full')) setMode('full');
      else if (params.get('view') === 'list') setMode('list');
      else setMode('map');
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setMode]);

  // Cleanup on unmount - only if still on Field route
  useEffect(() => () => {
    if (pathname === '/') {
      const params = new URLSearchParams(window.location.search);
      params.delete('full');
      params.delete('view');
      navigate(`?${params.toString()}`, { replace: true, preventScrollReset: true });
    }
  }, [pathname, navigate]);

  return <>{children}</>;
};