
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, MessageSquare, UserPlus, Shield } from 'lucide-react';
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback';
import { Button } from '@/components/ui/button';
import { zIndex } from '@/constants/z';

interface AvatarInteractionLayerProps {
  avatars: Array<{
    id: string;
    src?: string;
    fallbackText: string;
    username: string;
    x: number;
    y: number;
  }>;
  selectedIds: string[];
  onSelect: (id: string) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
  className?: string;
}

export const AvatarInteractionLayer: React.FC<AvatarInteractionLayerProps> = ({
  avatars,
  selectedIds,
  onSelect,
  onContextMenu,
  className = ""
}) => {
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu]);

  const handleAvatarClick = (id: string) => {
    onSelect(id);
    if (multiSelectMode) {
      // Multi-select logic
    }
  };

  const handleAvatarContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      id,
      x: rect.right + 8,
      y: rect.top
    });
    onContextMenu(id, rect.right + 8, rect.top);
  };

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Avatar markers */}
      {avatars.map((avatar) => (
        <div
          key={avatar.id}
          className="absolute pointer-events-auto"
          style={{
            left: `${avatar.x}%`,
            top: `${avatar.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <button
            onClick={() => handleAvatarClick(avatar.id)}
            onContextMenu={(e) => handleAvatarContextMenu(e, avatar.id)}
            className={`relative transition-transform duration-200 hover:scale-110 ${
              selectedIds.includes(avatar.id) ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
          >
            <AvatarWithFallback
              src={avatar.src}
              fallbackText={avatar.fallbackText}
              username={avatar.username}
              className="w-8 h-8"
            />
          </button>
        </div>
      ))}

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            {...zIndex('system')}
            className="absolute bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 py-2 h-auto"
              onClick={() => {
                // Handle message action
                setContextMenu(null);
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 py-2 h-auto"
              onClick={() => {
                // Handle follow action
                setContextMenu(null);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Follow
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 py-2 h-auto"
              onClick={() => {
                // Handle report action
                setContextMenu(null);
              }}
            >
              <Shield className="w-4 h-4 mr-2" />
              Report
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-select indicator */}
      {multiSelectMode && selectedIds.length > 0 && (
        <div 
          {...zIndex('overlay')}
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium"
        >
          {selectedIds.length} selected
        </div>
      )}

      {/* Backdrop overlay when context menu is open */}
      {contextMenu && (
        <div 
          {...zIndex('overlay')}
          className="absolute inset-0 bg-black/10 pointer-events-auto"
          onClick={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
