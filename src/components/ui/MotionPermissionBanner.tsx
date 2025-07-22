
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { zIndex } from '@/constants/z';

interface MotionPermissionBannerProps {
  requestMotionPermission: () => Promise<boolean>;
  isMotionAvailable: boolean;
}

export const MotionPermissionBanner = ({ 
  requestMotionPermission, 
  isMotionAvailable 
}: MotionPermissionBannerProps) => {
  const [hasMotionPermission, setHasMotionPermission] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setHasMotionPermission(isMotionAvailable);
  }, [isMotionAvailable]);

  const handleRequestPermission = async () => {
    const granted = await requestMotionPermission();
    setHasMotionPermission(granted);
    if (granted) {
      toast({
        title: "Motion sensors enabled!",
        description: "You can now use shake gestures for social discovery"
      });
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Don't show if motion is available, already granted, or dismissed
  if (hasMotionPermission || isMotionAvailable || isDismissed) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-16 left-1/2 transform -translate-x-1/2"
      {...zIndex('system')}
    >
      <div className="bg-accent/95 backdrop-blur-xl rounded-lg border border-accent/30 p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-accent-foreground" />
          <div className="flex-1">
            <div className="text-accent-foreground font-medium text-sm">
              Enable shake discovery
            </div>
            <div className="text-accent-foreground/80 text-xs">
              Allow motion sensors for gesture detection
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-xs px-2 py-1 text-accent-foreground/60 hover:text-accent-foreground"
            >
              Later
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRequestPermission}
              className="text-xs px-3 py-1"
            >
              Enable
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
