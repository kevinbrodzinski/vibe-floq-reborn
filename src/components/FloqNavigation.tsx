import { NavLink } from 'react-router-dom';
import { LayoutGrid, Circle, MessageCircle, Star, Calendar, Activity } from "lucide-react";
import { prefetchTab } from '@/utils/tabPrefetch';
import { useEffect, useRef } from 'react';
import { Z } from '@/constants/zLayers';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

const TABS: { id: string; label: string; Icon: any }[] = [
  { id: 'field', label: 'Field', Icon: LayoutGrid },
  { id: 'floqs', label: 'Floqs', Icon: Circle },
  { id: 'pulse', label: 'Pulse', Icon: Activity },
  { id: 'vibe', label: 'Vibe', Icon: MessageCircle },
  { id: 'afterglow', label: 'After', Icon: Star },
  { id: 'plan', label: 'Plan', Icon: Calendar },
];

export const FloqNavigation = () => {
  const navRef = useRef<HTMLElement>(null);
  const { navigationFeedback } = useHapticFeedback();

  // Export navigation height to CSS variable
  useEffect(() => {
    const updateNavHeight = () => {
      if (navRef.current) {
        const height = navRef.current.offsetHeight;
        document.documentElement.style.setProperty('--mobile-nav-height', `${height}px`);
      }
    };

    // Update on mount and resize
    updateNavHeight();
    window.addEventListener('resize', updateNavHeight);
    
    // Use ResizeObserver for more precise tracking
    if ('ResizeObserver' in window && navRef.current) {
      const resizeObserver = new ResizeObserver(updateNavHeight);
      resizeObserver.observe(navRef.current);
      
      return () => {
        window.removeEventListener('resize', updateNavHeight);
        resizeObserver.disconnect();
      };
    }

    return () => window.removeEventListener('resize', updateNavHeight);
  }, []);

  return (
    <nav ref={navRef} className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border/30" style={{ zIndex: Z.navigation }}>
      <div className="flex justify-around items-center py-2 px-2">
        {TABS.map(({ id, label, Icon }) => (
          <NavLink
            key={id}
            to={id === 'field' ? '/' : `/${id}`}
            
            onMouseEnter={() => prefetchTab(id as any)}
            onTouchStart={() => prefetchTab(id as any)}
            onClick={navigationFeedback}
            aria-label={`Navigate to ${label} section`}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-4 rounded-2xl transition-all duration-300 ${
                isActive
                  ? "bg-gradient-primary text-primary-foreground shadow-lg scale-110 animate-pulse-glow"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`
            }
          >
            <Icon size={20} className="mb-1" aria-hidden="true" />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};