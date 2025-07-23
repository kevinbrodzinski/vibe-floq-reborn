import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, ArrowLeft, User } from 'lucide-react';

interface OnboardingAvatarStepProps {
  avatarUrl: string | null;
  onAvatarSelect: (url: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function OnboardingAvatarStep({ avatarUrl, onAvatarSelect, onNext, onBack }: OnboardingAvatarStepProps) {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onAvatarSelect(url);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Add a profile picture</h2>
        <p className="text-muted-foreground">
          Help others recognize you (optional)
        </p>
      </div>
      
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <Avatar className="w-32 h-32">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-2xl">
              <User className="w-12 h-12" />
            </AvatarFallback>
          </Avatar>
          
          <label
            htmlFor="avatar-upload"
            className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
          >
            <Camera className="w-4 h-4" />
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
        
        <div className="text-center space-y-2">
          {avatarUrl ? (
            <p className="text-sm text-muted-foreground">
              Looking good! You can change this later.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click the camera icon to upload a photo
            </p>
          )}
        </div>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
        </Button>
      </div>
    </motion.div>
  );
}