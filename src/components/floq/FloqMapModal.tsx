import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloqMemberMap } from './FloqMemberMap';
import { zIndex } from '@/constants/z';

interface FloqMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  floqId: string;
}

export const FloqMapModal: React.FC<FloqMapModalProps> = ({
  isOpen,
  onClose,
  floqId
}) => {
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
              <h2 className="text-lg font-semibold">Member Locations</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <FloqMemberMap floqId={floqId} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}; 