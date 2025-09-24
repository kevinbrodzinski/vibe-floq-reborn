import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloqSocialSignals } from './FloqSocialSignals';
import { zIndex } from '@/constants/z';

interface FloqSocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  floqId: string;
}

export const FloqSocialModal: React.FC<FloqSocialModalProps> = ({
  isOpen,
  onClose,
  floqId
}) => {
  // Prevent background scrolling when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            {...zIndex('modal')}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 bg-background overflow-hidden"
            {...zIndex('modal')}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h2 className="text-lg font-semibold">Social Signals</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto h-full">
              <div className="p-4">
                <FloqSocialSignals floqId={floqId} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}; 