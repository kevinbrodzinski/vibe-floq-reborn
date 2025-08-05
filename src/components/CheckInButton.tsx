
import { MapPin, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCheckInStatus } from '@/hooks/useCheckInStatus';
import { useCheckInToggle } from '@/hooks/useCheckInToggle';
import { LoadingOverlay } from '@/components/ExecutionFeedbackUtils';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { zIndex } from '@/constants/z';

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
  const [successMessage, setSuccessMessage] = useState('')
  
  const checkedIn = !!checkInStatus
  const isLoading = checkInToggle.isPending

  const handleCheckIn = async () => {
    if (isLoading) return
    
    const wasChecked = checkedIn
    
    try {
      await checkInToggle.mutateAsync({
        planId,
        stopId,
        isCheckedIn: checkedIn
      })
      
      // Set message and show success feedback
      setSuccessMessage(wasChecked ? 'Checked out successfully!' : 'Checked in successfully!')
      setShowSuccessOverlay(true)
      setTimeout(() => setShowSuccessOverlay(false), 1500)
      
      onCheckInChange?.(!wasChecked)
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
      
      {/* Success overlay with improved mobile positioning */}
      {showSuccessOverlay && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className="fixed bottom-4 left-0 right-0 mx-4 md:absolute md:inset-0 md:mx-0"
          {...zIndex('toast')}
        >
          <div className="bg-card/95 backdrop-blur-sm rounded-xl p-4 text-center border border-border/20 shadow-lg">
            <Check className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-foreground">
              {successMessage}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};
