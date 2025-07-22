
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2, User } from 'lucide-react';
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback';
import { zIndex } from '@/constants/z';

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  username: string;
  avatar?: string;
  color?: string;
  lastSeen: number;
}

interface LiveCursorProps {
  cursors?: CursorPosition[];
  currentUserId?: string;
  showAvatars?: boolean;
  fadeDelay?: number;
  className?: string;
}

const CURSOR_FADE_TIME = 3000; // 3 seconds of inactivity

export const LiveCursor: React.FC<LiveCursorProps> = ({
  cursors = [],
  currentUserId,
  showAvatars = true,
  fadeDelay = CURSOR_FADE_TIME,
  className = ""
}) => {
  const [activeCursors, setActiveCursors] = useState<CursorPosition[]>([]);

  useEffect(() => {
    const now = Date.now();
    const filtered = cursors.filter(cursor => 
      cursor.userId !== currentUserId && 
      now - cursor.lastSeen < fadeDelay
    );
    setActiveCursors(filtered);
  }, [cursors, currentUserId, fadeDelay]);

  return (
    <div 
      {...zIndex('system')}
      className={`fixed inset-0 pointer-events-none ${className}`}
    >
      <AnimatePresence>
        {activeCursors.map((cursor) => {
          const age = Date.now() - cursor.lastSeen;
          const opacity = Math.max(0, 1 - (age / fadeDelay));

          return (
            <motion.div
              key={cursor.userId}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity,
                x: cursor.x,
                y: cursor.y
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25
              }}
              className="absolute pointer-events-none"
            >
              {/* Cursor pointer */}
              <motion.div
                className="relative"
                animate={{
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <MousePointer2 
                  className="h-6 w-6 drop-shadow-lg"
                  style={{ 
                    color: cursor.color || '#3b82f6',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                  }}
                />
              </motion.div>

              {/* User info bubble */}
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ delay: 0.2 }}
                className="absolute top-8 left-2 flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border/50"
              >
                {showAvatars && (
                  <AvatarWithFallback
                    src={cursor.avatar}
                    fallbackText={cursor.username.charAt(0)}
                    username={cursor.username}
                    className="w-6 h-6"
                  />
                )}
                <span className="text-sm font-medium text-foreground">
                  {cursor.username}
                </span>
              </motion.div>

              {/* Ripple effect */}
              <motion.div
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ 
                  scale: [1, 2, 3],
                  opacity: [0.6, 0.3, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
                className="absolute -top-1 -left-1 w-8 h-8 rounded-full border-2"
                style={{ 
                  borderColor: cursor.color || '#3b82f6'
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
