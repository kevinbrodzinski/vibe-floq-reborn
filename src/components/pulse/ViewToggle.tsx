import React from 'react';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { motion } from 'framer-motion';

export type ViewMode = 'carousel' | 'list';

interface ViewToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ 
  mode, 
  onModeChange, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center bg-white/10 backdrop-blur-xl rounded-2xl p-1 border border-white/20 ${className}`}>
      <button
        type="button"
        onClick={() => onModeChange('carousel')}
        className={`relative flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200 ${
          mode === 'carousel' 
            ? 'text-white' 
            : 'text-white/60 hover:text-white/80'
        }`}
        aria-label="Carousel view"
      >
        {mode === 'carousel' && (
          <motion.div
            layoutId="viewToggleBackground"
            className="absolute inset-0 bg-white/20 rounded-xl border border-white/30"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <LayoutGrid className="w-4 h-4 relative z-10" />
      </button>
      
      <button
        type="button"
        onClick={() => onModeChange('list')}
        className={`relative flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200 ${
          mode === 'list' 
            ? 'text-white' 
            : 'text-white/60 hover:text-white/80'
        }`}
        aria-label="List view"
      >
        {mode === 'list' && (
          <motion.div
            layoutId="viewToggleBackground"
            className="absolute inset-0 bg-white/20 rounded-xl border border-white/30"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <Rows3 className="w-4 h-4 relative z-10" />
      </button>
    </div>
  );
};