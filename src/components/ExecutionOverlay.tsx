
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Heart, Zap, Users, ThumbsUp } from 'lucide-react';
import { ExecutionActionEnum, type ExecutionAction } from '@/types/enums/executionAction';
import { zIndex } from '@/constants/z';

interface ExecutionOverlayProps {
  isVisible: boolean;
  action: ExecutionAction;
  feedback?: string;
  onComplete?: () => void;
  className?: string;
}

const actionIcons = {
  [ExecutionActionEnum.enum.vote]: ThumbsUp,
  [ExecutionActionEnum.enum.rsvp]: Users,
  [ExecutionActionEnum.enum['check-in']]: Check,
  [ExecutionActionEnum.enum['stop-action']]: Zap,
};

const actionColors = {
  [ExecutionActionEnum.enum.vote]: 'text-yellow-400',
  [ExecutionActionEnum.enum.rsvp]: 'text-blue-400', 
  [ExecutionActionEnum.enum['check-in']]: 'text-green-400',
  [ExecutionActionEnum.enum['stop-action']]: 'text-purple-400',
};

export const ExecutionOverlay = ({
  isVisible,
  action,
  feedback = 'Action completed!',
  onComplete,
  className = ""
}: ExecutionOverlayProps) => {
  const [phase, setPhase] = useState<'enter' | 'feedback' | 'exit'>('enter');
  
  const IconComponent = actionIcons[action];

  useEffect(() => {
    if (!isVisible) return;

    const timer1 = setTimeout(() => setPhase('feedback'), 200);
    const timer2 = setTimeout(() => setPhase('exit'), 1500);
    const timer3 = setTimeout(() => {
      onComplete?.();
      setPhase('enter');
    }, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm ${className}`}
          {...zIndex('modal')}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: phase === 'feedback' ? 1.1 : 1,
              opacity: 1 
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20 
            }}
            className="bg-card/95 backdrop-blur-xl rounded-3xl p-8 text-center max-w-sm mx-4 border border-border/30"
          >
            {/* Icon with enhanced animations */}
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ 
                scale: phase === 'feedback' ? 1.2 : 1,
                rotate: phase === 'feedback' ? 10 : 0
              }}
              transition={{ 
                duration: 0.4,
                ease: "easeInOut"
              }}
              className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center ${actionColors[action]} shadow-lg`}
            >
              <motion.div
                animate={{ 
                  scale: phase === 'feedback' ? 1.1 : 1,
                }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <IconComponent className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>

            {/* Feedback text */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feedback}
              </h3>
              <div className="flex items-center justify-center space-x-1 text-muted-foreground">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: phase === 'feedback' ? 1.5 : 1 
                    }}
                    transition={{ 
                      delay: i * 0.1,
                      duration: 0.4 
                    }}
                  >
                    <Heart className="w-3 h-3 fill-current" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
