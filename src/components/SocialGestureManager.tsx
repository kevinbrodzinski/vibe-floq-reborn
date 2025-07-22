import { useState, useEffect, useCallback } from 'react';
import { useAdvancedGestures, GestureEvent } from '@/hooks/useAdvancedGestures';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useDebug } from '@/lib/useDebug';
import { Button } from '@/components/ui/button';
import { Zap, Users, MessageCircle, MapPin, Smartphone, Sparkles } from 'lucide-react';
import { ZFriend, zIndex } from '@/constants/z';

interface SocialAction {
  id: string;
  type: 'shake-pulse' | 'social-radar' | 'quick-join' | 'vibe-broadcast' | 'location-share';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  gesture: string;
  triggered: boolean;
}

interface SocialGestureManagerProps {
  onSocialAction?: (action: SocialAction) => void;
  isActive?: boolean;
}

export const SocialGestureManager = ({ 
  onSocialAction,
  isActive = true 
}: SocialGestureManagerProps) => {
  const [recentGestures, setRecentGestures] = useState<GestureEvent[]>([]);
  const [socialActions] = useState<SocialAction[]>([
    {
      id: 'shake-pulse',
      type: 'shake-pulse',
      title: 'Shake to Pulse',
      description: 'See who\'s active right now',
      icon: Smartphone,
      gesture: 'shake',
      triggered: false
    },
    {
      id: 'social-radar',
      type: 'social-radar',
      title: 'Two-Finger Radar',
      description: 'Show all nearby connections',
      icon: Users,
      gesture: 'two-finger-tap',
      triggered: false
    },
    {
      id: 'quick-join',
      type: 'quick-join',
      title: 'Swipe to Join',
      description: 'Quick join nearby floqs',
      icon: Zap,
      gesture: 'swipe-right',
      triggered: false
    },
    {
      id: 'vibe-broadcast',
      type: 'vibe-broadcast',
      title: 'Long Press Vibe',
      description: 'Broadcast your current energy',
      icon: Sparkles,
      gesture: 'long-press',
      triggered: false
    }
  ]);
  
  const [gestureNotification, setGestureNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'info' | 'hint';
  }>({ visible: false, message: '', type: 'info' });

  const { socialHaptics } = useHapticFeedback();

  const handleGesture = useCallback((gesture: GestureEvent) => {
    if (!isActive) return;

    // Add to recent gestures
    setRecentGestures(prev => [...prev.slice(-4), gesture]);

    // Process social gestures
    switch (gesture.type) {
      case 'shake':
        if (gesture.intensity && gesture.intensity > 20) {
          const action = socialActions.find(a => a.type === 'shake-pulse');
          if (action) {
            onSocialAction?.(action);
            socialHaptics.shakeActivated();
            setGestureNotification({
              visible: true,
              message: '📡 Pulsing for active friends...',
              type: 'success'
            });
          }
        }
        break;

      case 'two-finger-tap':
        const radarAction = socialActions.find(a => a.type === 'social-radar');
        if (radarAction) {
          onSocialAction?.(radarAction);
          socialHaptics.gestureConfirm();
          setGestureNotification({
            visible: true,
            message: '🎯 Social radar activated',
            type: 'success'
          });
        }
        break;

      case 'swipe-right':
        if (gesture.intensity && gesture.intensity > 100) {
          const joinAction = socialActions.find(a => a.type === 'quick-join');
          if (joinAction) {
            onSocialAction?.(joinAction);
            socialHaptics.swipeSuccess();
            setGestureNotification({
              visible: true,
              message: '⚡ Looking for floqs to join...',
              type: 'success'
            });
          }
        }
        break;

      case 'long-press':
        if (gesture.duration && gesture.duration > 1000) {
          const vibeAction = socialActions.find(a => a.type === 'vibe-broadcast');
          if (vibeAction) {
            onSocialAction?.(vibeAction);
            socialHaptics.longPressActivated();
            setGestureNotification({
              visible: true,
              message: '✨ Broadcasting your vibe...',
              type: 'success'
            });
          }
        }
        break;

      case 'three-finger-tap':
        // Emergency "need company" signal
        socialHaptics.connectionMade();
        setGestureNotification({
          visible: true,
          message: '🆘 Sending "need company" signal',
          type: 'info'
        });
        break;

      default:
        break;
    }
  }, [isActive, socialActions, onSocialAction, socialHaptics]);

  const { controls: { startListening, stopListening, isListening } } = useAdvancedGestures({
    onGesture: handleGesture,
    longPressDelay: 800,
    swipeThreshold: 60,
    shakeThreshold: 20
  });

  useEffect(() => {
    if (isActive) {
      startListening();
    } else {
      stopListening();
    }

    return () => stopListening();
  }, [isActive, startListening, stopListening]);

  // Auto-hide gesture notifications
  useEffect(() => {
    if (gestureNotification.visible) {
      const timer = setTimeout(() => {
        setGestureNotification(prev => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gestureNotification.visible]);

  const showGestureHints = useCallback(() => {
    setGestureNotification({
      visible: true,
      message: '💡 Try: Shake for pulse, two fingers for radar, swipe right to join',
      type: 'hint'
    });
  }, []);

  return (
    <>
      {/* Gesture Status Indicator */}
      {isActive && (
        <div className="fixed top-4 right-4" style={zIndex('uiInteractive')}>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-card/80 backdrop-blur-xl border border-border/30 ${
              isListening ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={showGestureHints}
          >
            <Zap className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
          </Button>
        </div>
      )}

      {/* Gesture Notification */}
      {gestureNotification.visible && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2" style={zIndex('uiInteractive')}>
          <div className={`px-4 py-3 rounded-2xl backdrop-blur-xl border animate-fade-in ${
            gestureNotification.type === 'success' ? 'bg-primary/20 border-primary/30 text-primary' :
            gestureNotification.type === 'info' ? 'bg-card/90 border-border/30 text-foreground' :
            'bg-muted/90 border-muted-foreground/30 text-muted-foreground'
          }`}>
            <div className="text-sm font-medium text-center">
              {gestureNotification.message}
            </div>
          </div>
        </div>
      )}

      {/* Recent Gestures Debug */}
      {(() => {
        const [debug] = useDebug();
        if (!debug || recentGestures.length === 0) return null;
        return (
        <div className="fixed bottom-4 left-4 max-w-xs" style={zIndex('uiInteractive')}>
          <div className="bg-card/80 backdrop-blur-xl rounded-lg border border-border/30 p-3">
            <div className="text-xs text-muted-foreground mb-2">Recent Gestures:</div>
            {recentGestures.slice(-3).map((gesture, index) => (
              <div key={index} className="text-xs text-foreground/70 mb-1">
                {gesture.type} {gesture.intensity && `(${Math.round(gesture.intensity)})`}
              </div>
            ))}
          </div>
        </div>
        );
      })()}

      {/* Gesture Palette (activated by specific gesture) */}
      {/* This would be activated by a specific gesture combination */}
      {false && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl flex items-center justify-center" style={zIndex('modal')}>
          <div className="bg-card/95 backdrop-blur-xl rounded-3xl border border-border p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-center mb-4">Social Gestures</h3>
            <div className="grid grid-cols-2 gap-3">
              {socialActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="h-20 flex-col space-y-2"
                    onClick={() => onSocialAction?.(action)}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs text-center">{action.title}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};