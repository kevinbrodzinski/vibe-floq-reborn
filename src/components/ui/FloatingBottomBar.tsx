import React from 'react';
import { Plus, Circle, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IconBtn } from './IconBtn';

interface FloatingBottomBarProps {
  onShowCreate?: () => void;
  onShowFilter?: () => void;
}

export const FloatingBottomBar: React.FC<FloatingBottomBarProps> = ({
  onShowCreate,
  onShowFilter
}) => {
  const navigate = useNavigate();

  return (
    <footer className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] mx-auto max-w-sm flex justify-around backdrop-blur-md bg-white/5 rounded-full py-3 shadow-lg ring-1 ring-white/10 z-50">
      <IconBtn 
        icon={Plus} 
        label="New Floq" 
        onClick={() => onShowCreate?.()} 
      />
      <IconBtn 
        icon={Circle} 
        label="My Floqs" 
        onClick={() => navigate('/floqs')} 
      />
      <IconBtn 
        icon={Menu} 
        label="Filters" 
        onClick={() => onShowFilter?.()} 
      />
    </footer>
  );
};