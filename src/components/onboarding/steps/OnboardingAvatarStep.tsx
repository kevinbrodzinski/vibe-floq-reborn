import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, SkipForward } from 'lucide-react';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface OnboardingAvatarStepProps {
  avatarUrl: string | null;
  onAvatarSelect: (url: string) => void;
  onNext: () => void;
  onBack: () => void;
  displayName?: string;
}

export function OnboardingAvatarStep({ 
  avatarUrl, 
  onAvatarSelect, 
  onNext, 
  onBack, 
  displayName 
}: OnboardingAvatarStepProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarChange = async (newAvatarUrl: string | null) => {
    if (newAvatarUrl) {
      setIsUploading(true);
      try {
        // Avatar upload component handles the Supabase upload internally
        onAvatarSelect(newAvatarUrl);
        toast({
          title: "Avatar uploaded",
          description: "Your profile picture has been saved.",
        });
      } catch (error) {
        console.error('Avatar upload error:', error);
        toast({
          title: "Upload failed",
          description: "Failed to upload avatar. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    } else {
      onAvatarSelect('');
    }
  };

  const handleSkip = () => {
    onAvatarSelect('');
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Add Your Photo</h2>
        <p className="text-muted-foreground">
          Help others recognize you when you connect in person (optional)
        </p>
      </div>
      
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <AvatarUpload
            currentAvatarUrl={avatarUrl}
            displayName={displayName}
            onAvatarChange={handleAvatarChange}
            size={128}
          />
        </div>
        
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Camera className="w-4 h-4" />
            <span>Upload from camera or gallery</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your photo is only visible to your connections
          </p>
        </div>
      </div>
      
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} disabled={isUploading}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="outline" onClick={handleSkip} disabled={isUploading}>
          <SkipForward className="w-4 h-4 mr-2" />
          Skip for now
        </Button>
        <Button onClick={onNext} disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Continue'}
        </Button>
      </div>
    </motion.div>
  );
}