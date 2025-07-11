import { NavLink } from 'react-router-dom';
import { useActiveTab, type FloqTab } from "@/store/useActiveTab";
import { LayoutGrid, Circle, MessageCircle, Star, Calendar, Activity } from "lucide-react";
import { prefetchTab } from '@/utils/tabPrefetch';

const TABS: { id: FloqTab; label: string; Icon: any }[] = [
  { id: 'field', label: 'Field', Icon: LayoutGrid },
  { id: 'floqs', label: 'Floqs', Icon: Circle },
  { id: 'pulse', label: 'Pulse', Icon: Activity },
  { id: 'vibe', label: 'Vibe', Icon: MessageCircle },
  { id: 'afterglow', label: 'After', Icon: Star },
  { id: 'plan', label: 'Plan', Icon: Calendar },
];

export const FloqNavigation = () => {
  const { setTab } = useActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-xl border-t border-white/10 z-30 pb-safe-bottom">
      <div className="flex justify-around items-center py-2 px-2 h-16">
        {TABS.map(({ id, label, Icon }) => (
          <NavLink
            key={id}
            to={`/${id}`}
            onClick={() => setTab(id, false /* already pushed by NavLink */)}
            onMouseEnter={() => prefetchTab(id)}
            onTouchStart={() => prefetchTab(id)}
            aria-label={`Navigate to ${label} section`}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-4 rounded-2xl transition-all duration-300 ${
                isActive
                  ? "bg-gradient-primary text-primary-foreground shadow-lg scale-110 animate-pulse-glow"
                  : "text-white/60 hover:text-foreground hover:bg-secondary/50"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon 
                  size={24} 
                  className={`mb-1 transition-transform ${
                    isActive ? "text-primary scale-110" : "text-white/60"
                  }`} 
                  aria-hidden="true" 
                />
                <span className="text-xs font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};