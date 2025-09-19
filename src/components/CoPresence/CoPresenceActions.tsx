import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CoPresenceActionsProps {
  visible: boolean;
  onClose: () => void;
  onRallyNow?: () => void | Promise<void>;
  onMeetHalfway?: () => void | Promise<void>;
}

export default function CoPresenceActions({
  visible,
  onClose,
  onRallyNow,
  onMeetHalfway,
}: CoPresenceActionsProps) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Action Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4"
          >
            <div className="glass rounded-2xl p-4 space-y-3 max-w-sm mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Co-presence Actions</h3>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Actions */}
              <div className="space-y-2">
                <Button
                  onClick={async () => {
                    await onRallyNow?.();
                    onClose();
                  }}
                  className="w-full justify-start gap-3"
                  variant="outline"
                >
                  <Zap className="w-4 h-4" />
                  Rally Now
                </Button>
                
                <Button
                  onClick={async () => {
                    await onMeetHalfway?.();
                    onClose();
                  }}
                  className="w-full justify-start gap-3"
                  variant="outline"
                >
                  <Users className="w-4 h-4" />
                  Meet Halfway
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}