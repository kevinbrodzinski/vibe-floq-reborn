import { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFloqUI } from '@/contexts/FloqUIContext';
import { storage } from '@/lib/storage';

export function useNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedFloqId, setSelectedFloqId } = useFloqUI();

  // Enhanced back navigation with state cleanup
  const goBack = useCallback(() => {
    // Clear selected floq when navigating back
    setSelectedFloqId(null);
    
    // Try to go back in history, or use fallback
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/floqs');
    }
  }, [navigate, setSelectedFloqId]);

  // Navigate to floq with state management
  const navigateToFloq = useCallback((floqId: string) => {
    setSelectedFloqId(floqId);
    navigate(`/floqs/${floqId}`, { 
      state: { from: location.pathname },
      replace: false 
    });
  }, [navigate, location.pathname, setSelectedFloqId]);

  // Navigate to tab with proper state cleanup
  const navigateToTab = useCallback((tab: string) => {
    setSelectedFloqId(null);
    navigate(tab === 'field' ? '/' : `/${tab}`);
  }, [navigate, setSelectedFloqId]);

  // Handle deep links on mount
  useEffect(() => {
    const path = location.pathname;
    const floqMatch = path.match(/^\/floqs\/([^\/]+)$/);
    
    if (floqMatch) {
      const floqId = floqMatch[1];
      setSelectedFloqId(floqId);
    }
  }, [location.pathname, setSelectedFloqId]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'floq_selected_id') {
        const newFloqId = event.newValue;
        if (newFloqId !== selectedFloqId) {
          setSelectedFloqId(newFloqId);
          if (newFloqId) {
            navigate(`/floqs/${newFloqId}`, { replace: true });
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedFloqId, setSelectedFloqId, navigate]);

  // Sync selected floq to storage for cross-tab communication
  useEffect(() => {
    const syncStorage = async () => {
      if (selectedFloqId) {
        await storage.setItem('floq_selected_id', selectedFloqId);
      } else {
        await storage.removeItem('floq_selected_id');
      }
    };
    syncStorage();
  }, [selectedFloqId]);

  return {
    goBack,
    navigateToFloq,
    navigateToTab,
    currentPath: location.pathname,
    selectedFloqId,
  };
}