import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Users, Zap, Bell } from 'lucide-react';

const FEATURES = [
  {
    icon: MapPin,
    title: 'Discover Nearby',
    description: 'Find people and events happening around you in real-time'
  },
  {
    icon: Users,
    title: 'Join Floqs',
    description: 'Connect with groups that match your current vibe and interests'
  },
  {
    icon: Zap,
    title: 'Spontaneous Meetups',
    description: 'Create or join last-minute gatherings and activities'
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Get notified when something interesting happens nearby'
  }
];

interface OnboardingFeaturesStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function OnboardingFeaturesStep({ onNext, onBack }: OnboardingFeaturesStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">What you can do with Floq</h2>
        <p className="text-muted-foreground">
          Here's what makes Floq special
        </p>
      </div>
      
      <div className="space-y-4">
        {FEATURES.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start space-x-4 p-4 rounded-lg border bg-card"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <feature.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext}>
          Almost Done!
        </Button>
      </div>
    </motion.div>
  );
}