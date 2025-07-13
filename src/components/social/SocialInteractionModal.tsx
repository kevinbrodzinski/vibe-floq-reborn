import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Users, Zap, Heart, UserPlus, Calendar, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useFloqJoin } from '@/hooks/useFloqJoin';
import { useToast } from '@/hooks/use-toast';

interface Person {
  id: string;
  name: string;
  vibe: string;
  color: string;
  isFriend?: boolean;
  avatar_url?: string | null;
}

interface SocialInteractionModalProps {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDMOpen?: (personId: string) => void;
}

export const SocialInteractionModal = ({
  person,
  open,
  onOpenChange,
  onDMOpen
}: SocialInteractionModalProps) => {
  const { socialHaptics } = useHapticFeedback();
  const { sendRequest, isSending } = useFriendRequests();
  const { join } = useFloqJoin();
  const { toast } = useToast();
  const [showFloqCreate, setShowFloqCreate] = useState(false);

  if (!person) return null;

  const handleAction = (action: string) => {
    socialHaptics.gestureConfirm();
    
    switch (action) {
      case 'dm':
        onDMOpen?.(person.id);
        onOpenChange(false);
        break;
      case 'friend-request':
        sendRequest(person.id);
        onOpenChange(false);
        break;
      case 'vibe-check':
        toast({
          title: "Vibe check sent! ✨",
          description: `You sent ${person.name} a vibe check`,
        });
        onOpenChange(false);
        break;
      case 'invite-floq':
        setShowFloqCreate(true);
        break;
      case 'meetup':
        toast({
          title: "Meetup request sent! 📍",
          description: `You suggested meeting up with ${person.name}`,
        });
        onOpenChange(false);
        break;
      case 'create-floq':
        // TODO: Open floq creation modal with person pre-invited
        toast({
          title: "Floq creation started! 🌟",
          description: `Creating a floq with ${person.name}`,
        });
        onOpenChange(false);
        break;
      default:
        onOpenChange(false);
    }
  };

  const actions = person.isFriend 
    ? [
        { id: 'dm', icon: MessageCircle, label: 'Message', color: 'text-blue-500' },
        { id: 'invite-floq', icon: Users, label: 'Invite to Floq', color: 'text-purple-500' },
        { id: 'meetup', icon: MapPin, label: 'Suggest Meetup', color: 'text-green-500' },
        { id: 'vibe-check', icon: Zap, label: 'Vibe Check', color: 'text-yellow-500' },
      ]
    : [
        { id: 'dm', icon: MessageCircle, label: 'Say Hi', color: 'text-blue-500' },
        { id: 'friend-request', icon: UserPlus, label: 'Add Friend', color: 'text-green-500' },
        { id: 'create-floq', icon: Calendar, label: 'Start Floq', color: 'text-purple-500' },
        { id: 'vibe-check', icon: Zap, label: 'Vibe Check', color: 'text-yellow-500' },
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: person.color }}
            >
              <span className="text-white font-medium">
                {person.name[0].toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-medium">{person.name}</div>
              <div className="text-sm text-muted-foreground capitalize">
                {person.vibe} vibe
                {person.isFriend && (
                  <span className="ml-2 text-primary">• Friend</span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  className="w-full justify-start h-12"
                  onClick={() => handleAction(action.id)}
                  disabled={action.id === 'friend-request' && isSending}
                >
                  <Icon className={`h-5 w-5 mr-3 ${action.color}`} />
                  <span className="font-medium">{action.label}</span>
                  {action.id === 'friend-request' && isSending && (
                    <div className="ml-auto">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {showFloqCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t pt-4 mt-4"
            >
              <div className="text-sm text-muted-foreground mb-3">
                Quick floq options with {person.name}:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('create-floq')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Hangout
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('create-floq')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Group Up
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};