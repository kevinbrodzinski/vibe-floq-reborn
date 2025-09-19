import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SocialBatterySheetProps {
  open: boolean;
  onClose: () => void;
  energy: number;
  dir: 'rising' | 'stable' | 'falling';
  onRallyNow?: () => void | Promise<void>;
  onMeetHalfway?: () => void | Promise<void>;
}

export default function SocialBatterySheet({ 
  open, 
  onClose, 
  energy, 
  dir, 
  onRallyNow, 
  onMeetHalfway 
}: SocialBatterySheetProps) {
  const pct = Math.round(energy * 100);
  const dirLabel = dir === 'rising' ? 'Rising' : dir === 'falling' ? 'Falling' : 'Stable';
  
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm mx-4"
          >
            <div className="glass rounded-2xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Zap className="w-5 h-5 text-primary" />
                    <div 
                      className="absolute inset-0 rounded-full border-2 border-primary/30"
                      style={{
                        background: `conic-gradient(hsl(var(--primary)) ${pct}%, transparent ${pct}%)`
                      }}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Social Battery</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Status */}
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-foreground">{pct}%</div>
                <div className="text-sm text-muted-foreground">{dirLabel}</div>
              </div>
              
              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={async () => {
                    await onRallyNow?.();
                    onClose();
                  }}
                  className="flex flex-col gap-2 h-auto py-4"
                  variant="outline"
                >
                  <Zap className="w-5 h-5" />
                  <span>Rally Now</span>
                </Button>
                <Button
                  onClick={async () => {
                    await onMeetHalfway?.();
                    onClose();
                  }}
                  className="flex flex-col gap-2 h-auto py-4"
                  variant="outline"
                >
                  <Users className="w-5 h-5" />
                  <span>Meet Halfway</span>
                </Button>
              </div>
              
              {/* Close */}
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}