import { MapPin, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCheckInStatus } from '@/hooks/useCheckInStatus';
import { useCheckInToggle } from '@/hooks/useCheckInToggle';
import { LoadingOverlay } from '@/components/ExecutionFeedbackUtils';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface CheckInButtonProps {
  planId: string;
  stopId: string;
  onCheckInChange?: (checkedIn: boolean) => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export const CheckInButton = ({
  planId,
  stopId,
  onCheckInChange,
  variant = "default",
  size = "default",
  className = ""
}: CheckInButtonProps) => {
  const { data: checkInStatus } = useCheckInStatus(planId, stopId)
  const checkInToggle = useCheckInToggle()
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  
  const checkedIn = !!checkInStatus
  const isLoading = checkInToggle.isPending

  const handleCheckIn = async () => {
    if (isLoading) return
    
    try {
      await checkInToggle.mutateAsync({
        planId,
        stopId,
        isCheckedIn: checkedIn
      })
      
      // Show success feedback
      setShowSuccessOverlay(true)
      setTimeout(() => setShowSuccessOverlay(false), 1500)
      
      onCheckInChange?.(!checkedIn)
    } catch (error) {
      console.error('Check-in error:', error)
    }
  }

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{checkedIn ? 'Checking out...' : 'Checking in...'}</span>
        </>
      );
    }

    if (checkedIn) {
      return (
        <>
          <Check className="w-4 h-4" />
          <span>Checked In</span>
        </>
      );
    }

    return (
      <>
        <MapPin className="w-4 h-4" />
        <span>Check In</span>
      </>
    );
  };

  const getButtonVariant = () => {
    if (checkedIn) {
      return "default";
    }
    return variant;
  };

  const getButtonClasses = () => {
    const baseClasses = "transition-all duration-200";
    
    if (checkedIn) {
      return `${baseClasses} bg-green-600 hover:bg-green-700 text-white border-green-600 animate-pulse`;
    }
    
    if (isLoading) {
      return `${baseClasses} animate-pulse`;
    }
    
    return baseClasses;
  };

  return (
    <div className="relative">
      <Button
        variant={getButtonVariant()}
        size={size}
        onClick={handleCheckIn}
        disabled={isLoading}
        className={`${getButtonClasses()} ${className}`}
      >
        {getButtonContent()}
      </Button>
      
      {/* Loading Overlay - Fixed positioning for mobile */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 md:absolute md:inset-0 md:transform-none"
        >
          <LoadingOverlay 
            label={checkedIn ? 'Checking out...' : 'Checking in...'} 
            variant="minimal" 
          />
        </motion.div>
      )}
    </div>
  );
};