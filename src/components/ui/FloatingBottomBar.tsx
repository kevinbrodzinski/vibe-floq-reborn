
import React from 'react';
import { Plus, Circle, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IconBtn } from './IconBtn';
import { usePresenceCount } from '@/hooks/usePresenceCount';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { zIndex } from '@/constants/z';

interface FloatingBottomBarProps {
  onShowCreate?: () => void;
  onShowFilter?: () => void;
  badge?: number;
}

export const FloatingBottomBar: React.FC<FloatingBottomBarProps> = ({
  onShowCreate,
  onShowFilter,
  badge
}) => {
  const navigate = useNavigate();
  const currentVibe = useCurrentVibe() as string;
  const presenceCount = usePresenceCount(currentVibe as any);
  
  // Use badge prop if provided, otherwise use presence count
  const displayBadge = badge ?? presenceCount;

  return (
    <footer 
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] mx-auto max-w-sm flex justify-around backdrop-blur-md bg-white/5 rounded-full py-3 shadow-lg ring-1 ring-white/10"
      {...zIndex('system')}
    >
      <IconBtn 
        icon={Plus} 
        label="New Floq" 
        onClick={() => onShowCreate?.()} 
      />
      <div className="relative">
        <IconBtn 
          icon={Circle} 
          label="My Floqs" 
          onClick={() => navigate('/floqs')} 
        />
        {displayBadge > 0 && (
          <div 
            className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1 animate-pulse"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              fontSize: '10px',
              animation: 'scale 0.4s ease-out',
            }}
          >
            {displayBadge >= 15 ? '15+' : displayBadge}
          </div>
        )}
      </div>
      <IconBtn 
        icon={Menu} 
        label="Filters" 
        onClick={() => onShowFilter?.()} 
      />
    </footer>
  );
};
