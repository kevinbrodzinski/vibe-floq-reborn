import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, Calendar, Building } from 'lucide-react';

interface FabOptionButtonProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onPress: () => void;
}

function FabOptionButton({ label, icon: Icon, onPress }: FabOptionButtonProps) {
  return (
    <button
      onClick={onPress}
      className="group relative h-11 w-11 rounded-full border border-white/15 bg-black/60 backdrop-blur pointer-events-auto transition hover:scale-110 hover:shadow-xl"
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
      <span className="absolute right-12 rounded bg-black/95 border border-white/10 px-2 py-1 text-[11px] opacity-0 translate-x-2 transition group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none">
        {label}
      </span>
    </button>
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
  const [ripple, setRipple] = React.useState<{ x: number; y: number; size: number } | null>(null);

  return (
    <>
      {/* Backdrop blur overlay when expanded */}
      {open && (
        <div
          onClick={onToggle}
          className="fixed inset-0 z-[54] bg-black/20 backdrop-blur-sm"
          aria-hidden
        />
      )}

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

      {/* Ambient floaters (pause when open by not rendering) */}
      {!open && (
        <div className="pointer-events-none fixed bottom-20 right-2 z-[59] h-[100px] w-[100px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="absolute block h-[2px] w-[2px] rounded-full opacity-0 will-change-transform"
              style={{
                left: 35 + i * 5,
                background: 'hsl(var(--primary))',
                boxShadow: '0 0 4px rgba(102,126,234,0.7)',
                animation: `floatUp 4s linear ${i * 0.4}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Orbiters */}
      {!open && (
        <div className="pointer-events-none fixed bottom-[88px] right-[22px] z-[59] h-[48px] w-[48px]">
          {[0, 2, 4].map((delay) => (
            <span
              key={delay}
              className="absolute left-1/2 top-1/2 block h-[3px] w-[3px] rounded-full will-change-transform"
              style={{
                background: 'rgba(102,126,234,0.6)',
                boxShadow: '0 0 6px rgba(102,126,234,0.8)',
                animation: `orbit 6s linear -${delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

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

      {/* Main FAB - Liquid Glass */}
      <button
        aria-expanded={open}
        aria-label="Create"
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          setRipple({ 
            x: e.clientX - rect.left - size / 2, 
            y: e.clientY - rect.top - size / 2, 
            size 
          });
          onToggle();
          setTimeout(() => setRipple(null), 600);
        }}
        className="fixed bottom-16 right-4 z-[60] h-12 w-12 rounded-full text-primary-foreground border border-white/10 shadow-lg transition hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15))',
          backdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <span className={`relative z-10 block transition ${open ? 'rotate-45' : ''}`}>
          <Plus className="h-5 w-5" />
        </span>

        {/* rotating conic glow */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 180deg, rgba(102,126,234,0.0) 0deg, rgba(102,126,234,0.35) 90deg, rgba(118,75,162,0.35) 180deg, rgba(102,126,234,0.35) 270deg, rgba(102,126,234,0.0) 360deg)',
            filter: 'blur(8px)',
            animation: 'spin 3s linear infinite',
          }}
        />

        {/* shimmer */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.25) 40%, transparent 100%)',
            animation: 'shimmer 3s linear infinite',
          }}
        />

        {/* ripple */}
        {ripple && (
          <span
            aria-hidden
            className="absolute rounded-full"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)',
              transform: 'scale(0)',
              animation: 'ripple 0.6s ease-out forwards',
            }}
          />
        )}
        
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-[color:var(--destructive)] text-[color:var(--destructive-foreground)] text-[10px] grid place-items-center px-1 font-medium">
            {badgeCount}
          </span>
        )}
      </button>
    </>
  );
}