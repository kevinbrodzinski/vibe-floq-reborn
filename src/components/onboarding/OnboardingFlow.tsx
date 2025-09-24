import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Users, 
  Bell, 
  Sparkles, 
  ArrowRight, 
  Check,
  UserPlus,
  Settings
} from 'lucide-react';

type OnboardingStep = 'welcome' | 'profile' | 'permissions' | 'privacy' | 'complete';

const steps: { id: OnboardingStep; title: string; description: string }[] = [
  { id: 'welcome', title: 'Welcome to Floq', description: 'Let\'s get you set up' },
  { id: 'profile', title: 'Your Profile', description: 'Tell us about yourself' },
  { id: 'permissions', title: 'Permissions', description: 'Enable key features' },
  { id: 'privacy', title: 'Privacy Settings', description: 'Control your visibility' },
  { id: 'complete', title: 'All Set!', description: 'Ready to connect' },
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    display_name: '',
    bio: '',
    location_sharing_enabled: true,
    notification_preferences: {
      rallies: true,
      messages: true,
      invites: true
    }
  });

  const { user } = useAuth();
  const { toast } = useToast();

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  const handleNext = async () => {
    setLoading(true);
    try {
      if (currentStep === 'profile') {
        await updateProfile();
      } else if (currentStep === 'permissions') {
        await requestPermissions();
      } else if (currentStep === 'privacy') {
        await savePrivacySettings();
      }

      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex].id);
      } else {
        await markOnboardingComplete();
        onComplete();
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: user.email?.split('@')[0] || profileData.display_name.toLowerCase().replace(/\s+/g, ''),
        display_name: profileData.display_name,
        bio: profileData.bio,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  };

  const requestPermissions = async () => {
    // Request location permission
    if ('geolocation' in navigator) {
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
      } catch (error) {
        console.warn('Location permission denied');
      }
    }

    // Request notification permission
    if ('Notification' in window) {
      await Notification.requestPermission();
    }
  };

  const savePrivacySettings = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        profile_id: user.id,
        location_sharing_enabled: profileData.location_sharing_enabled,
        notification_preferences: profileData.notification_preferences,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  };

  const markOnboardingComplete = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('user_onboarding_progress')
      .upsert({
        profile_id: user.id,
        completed_version: '1.0',
        completed_at: new Date().toISOString()
      });

    if (error) throw error;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-primary shadow-glow-primary flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Floq!</h2>
              <p className="text-muted-foreground">
                Connect with friends in real-time and never miss a moment together.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <MapPin className="w-5 h-5 text-accent" />
                <span>Share location with friends</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <Users className="w-5 h-5 text-accent" />
                <span>Join groups and coordinate</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <Bell className="w-5 h-5 text-accent" />
                <span>Get notified about rallies</span>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <UserPlus className="w-12 h-12 mx-auto mb-4 text-accent" />
              <h2 className="text-xl font-bold mb-2">Set Up Your Profile</h2>
              <p className="text-muted-foreground text-sm">
                Help your friends recognize you
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  placeholder="What should friends call you?"
                  value={profileData.display_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, display_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Input
                  id="bio"
                  placeholder="Tell us a bit about yourself"
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>
            </div>
          </div>
        );

      case 'permissions':
        return (
          <div className="text-center space-y-6">
            <Settings className="w-12 h-12 mx-auto text-accent" />
            <div>
              <h2 className="text-xl font-bold mb-2">Enable Key Features</h2>
              <p className="text-muted-foreground text-sm">
                We need a few permissions to make Floq work great
              </p>
            </div>
            <div className="space-y-4 text-left">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-5 h-5 text-accent" />
                  <span className="font-medium">Location Services</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share your location with friends and discover nearby activities
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Bell className="w-5 h-5 text-accent" />
                  <span className="font-medium">Notifications</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get notified when friends start rallies or send messages
                </p>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Settings className="w-12 h-12 mx-auto mb-4 text-accent" />
              <h2 className="text-xl font-bold mb-2">Privacy Settings</h2>
              <p className="text-muted-foreground text-sm">
                Control how you share and what you receive
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <div className="font-medium">Share Location</div>
                  <div className="text-sm text-muted-foreground">Let friends see where you are</div>
                </div>
                <input
                  type="checkbox"
                  checked={profileData.location_sharing_enabled}
                  onChange={(e) => setProfileData(prev => ({ 
                    ...prev, 
                    location_sharing_enabled: e.target.checked 
                  }))}
                  className="rounded"
                />
              </div>
              <div className="space-y-3">
                <div className="font-medium">Notification Preferences</div>
                {Object.entries(profileData.notification_preferences).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-sm capitalize">{key}</span>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        notification_preferences: {
                          ...prev.notification_preferences,
                          [key]: e.target.checked
                        }
                      }))}
                      className="rounded"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-primary shadow-glow-primary flex items-center justify-center">
              <Check className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
              <p className="text-muted-foreground">
                Welcome to Floq. Start connecting with friends and discover what's happening around you.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-field flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStepIndex + 1} of {steps.length}</span>
            <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <motion.div
              className="bg-gradient-primary h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Content */}
        <motion.div
          layout
          className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-6"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          <div className="pt-6 space-y-3">
            <Button 
              onClick={handleNext}
              className="w-full"
              disabled={loading || (currentStep === 'profile' && !profileData.display_name.trim())}
            >
              {loading ? (
                'Processing...'
              ) : currentStep === 'complete' ? (
                <>
                  Enter Floq
                  <Sparkles className="ml-2 w-4 h-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>

            {currentStep !== 'welcome' && currentStep !== 'complete' && (
              <Button
                variant="outline"
                onClick={() => {
                  const prevIndex = currentStepIndex - 1;
                  if (prevIndex >= 0) {
                    setCurrentStep(steps[prevIndex].id);
                  }
                }}
                className="w-full"
              >
                Back
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};