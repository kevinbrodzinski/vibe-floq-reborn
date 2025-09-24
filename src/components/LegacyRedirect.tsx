import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FloqTab } from '@/store/useActiveTab';

const VALID_TABS: FloqTab[] = ['field', 'floqs', 'pulse', 'vibe', 'afterglow', 'plan'];

export const LegacyRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Redirect /field to root path
    if (location.pathname === '/field') {
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  return null;
};