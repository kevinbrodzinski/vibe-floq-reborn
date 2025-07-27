import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';

interface ProfileData {
  username: string;
  display_name: string;
  bio?: string;
  interests?: string[];
}

interface OnboardingProfileStepProps {
  profileData: ProfileData;
  onProfileUpdate: (data: ProfileData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function OnboardingProfileStep({ profileData, onProfileUpdate, onNext, onBack }: OnboardingProfileStepProps) {
  const [localData, setLocalData] = useState(profileData || { username: '', display_name: '', bio: '' });

  const MAX_BIO = 280;
  const MAX_NAME = 40;
  const MAX_USERNAME = 30;

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    let processedValue = value;
    
    // Apply length limits
    if (field === 'display_name') {
      processedValue = value.slice(0, MAX_NAME);
    } else if (field === 'bio') {
      processedValue = value.slice(0, MAX_BIO);
    } else if (field === 'username') {
      processedValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, MAX_USERNAME);
    }
    
    const updated = { ...localData, [field]: processedValue };
    setLocalData(updated);
    onProfileUpdate(updated);
  };

  const isValid = localData.display_name.trim().length > 0 && localData.username.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Create your profile</h2>
        <p className="text-muted-foreground">
          Tell others a bit about yourself
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="display_name">Display Name</Label>
            <span className="text-xs text-muted-foreground">
              {localData.display_name.length}/{MAX_NAME}
            </span>
          </div>
          <Input
            id="display_name"
            placeholder="How should people know you?"
            value={localData.display_name}
            onChange={(e) => handleInputChange('display_name', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="username">Username</Label>
            <span className="text-xs text-muted-foreground">
              {localData.username.length}/{MAX_USERNAME}
            </span>
          </div>
          <Input
            id="username"
            placeholder="@username"
            value={localData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="bio">Bio (optional)</Label>
            <span className="text-xs text-muted-foreground">
              {(localData.bio || '').length}/{MAX_BIO}
            </span>
          </div>
          <Textarea
            id="bio"
            placeholder="Tell us a bit about yourself..."
            value={localData.bio || ''}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          Continue
        </Button>
      </div>
    </motion.div>
  );
}