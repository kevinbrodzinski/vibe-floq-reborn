import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, Calendar, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FabOptionButtonProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onPress: () => void;
}

function FabOptionButton({ label, icon: Icon, onPress }: FabOptionButtonProps) {
  return (
    <Button
      onClick={onPress}
      size="sm"
      variant="secondary"
      className="h-11 w-11 rounded-full bg-[color:var(--background)]/90 backdrop-blur border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition shadow-lg group relative"
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
      <span className="absolute right-14 text-xs font-medium px-2 py-1 rounded bg-[color:var(--background)]/95 border border-[color:var(--border)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {label}
      </span>
    </Button>
  );
}

interface FloatingActionButtonProps {
  open: boolean;
  onToggle: () => void;
  onSelect: (key: 'moment' | 'plan' | 'business') => void;
  badgeCount?: number;
}

export function FloatingActionButton({ 
  open, 
  onToggle, 
  onSelect, 
  badgeCount = 0 
}: FloatingActionButtonProps) {
  return (
    <>
      {/* Halo effect */}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[50]">
        <motion.div 
          className="h-10 w-10 rounded-full bg-[color:var(--primary)]/20 blur-xl"
          animate={{ 
            scale: open ? 1.2 : 1,
            opacity: open ? 0.8 : 0.6 
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Options */}
      <AnimatePresence>
        {open && (
          <div className="fixed bottom-24 right-6 z-[55] pointer-events-none">
            <motion.div
              className="absolute -bottom-14 right-0 pointer-events-auto"
              initial={{ opacity: 0, y: 12, scale: 0.8 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 12, scale: 0.8 }}
              transition={{ delay: 0.0, duration: 0.2 }}
            >
              <FabOptionButton 
                label="Start Moment" 
                icon={Zap}
                onPress={() => onSelect('moment')} 
              />
            </motion.div>
            
            <motion.div
              className="absolute -bottom-4 right-14 pointer-events-auto"
              initial={{ opacity: 0, y: 12, scale: 0.8 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 12, scale: 0.8 }}
              transition={{ delay: 0.08, duration: 0.2 }}
            >
              <FabOptionButton 
                label="Plan Ahead" 
                icon={Calendar}
                onPress={() => onSelect('plan')} 
              />
            </motion.div>
            
            <motion.div
              className="absolute bottom-8 right-14 pointer-events-auto"
              initial={{ opacity: 0, y: 12, scale: 0.8 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 12, scale: 0.8 }}
              transition={{ delay: 0.16, duration: 0.2 }}
            >
              <FabOptionButton 
                label="Business Post" 
                icon={Building}
                onPress={() => onSelect('business')} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <Button
        onClick={onToggle}
        size="lg"
        className="fixed bottom-16 right-4 z-[60] h-12 w-12 rounded-full bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-lg border border-[color:var(--border)]/50 hover:scale-105 transition-transform"
        aria-expanded={open}
        aria-label="Create"
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="h-5 w-5" />
        </motion.div>
        
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-[color:var(--destructive)] text-[color:var(--destructive-foreground)] text-[10px] grid place-items-center px-1 font-medium">
            {badgeCount}
          </span>
        )}
      </Button>
    </>
  );
}