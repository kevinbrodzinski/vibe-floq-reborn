import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FloqTab } from '@/store/useActiveTab';

const VALID_TABS: FloqTab[] = ['field', 'floqs', 'pulse', 'vibe', 'afterglow', 'plan'];

export const LegacyRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only handle root path with tab query parameter
    if (location.pathname === '/') {
      const searchParams = new URLSearchParams(location.search);
      const tabParam = searchParams.get('tab') as FloqTab;
      
      if (tabParam && VALID_TABS.includes(tabParam)) {
        // 301 redirect to new path structure
        navigate(`/${tabParam}`, { replace: true });
      } else if (tabParam) {
        // Invalid tab, redirect to field
        navigate('/field', { replace: true });
      } else {
        // No tab param, default to field
        navigate('/field', { replace: true });
      }
    }
  }, [location, navigate]);

  return null;
};