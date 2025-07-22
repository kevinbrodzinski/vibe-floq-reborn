import { useState, useEffect, useCallback } from 'react';
import { useAdvancedGestures } from '@/hooks/useAdvancedGestures';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useDebug } from '@/lib/useDebug';
import { Button } from '@/components/ui/button';
import { Users, Orbit, Zap, Heart, Sparkles, RotateCcw } from 'lucide-react';
import { ZConstellation, zIndex } from '@/constants/z';

interface ConstellationAction {
  id: string;
  type: 'orbital-adjust' | 'constellation-create' | 'energy-share' | 'group-plan' | 'temporal-view';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  gesture: string;
  activated: boolean;
}

interface ConstellationGestureSystemProps {
  onConstellationAction?: (action: ConstellationAction) => void;
  onOrbitalAdjustment?: (direction: 'expand' | 'contract', intensity: number) => void;
  onEnergyShare?: (fromId: string, toId: string, energy: number) => void;
  isActive?: boolean;
}

export const ConstellationGestureSystem = ({
  onConstellationAction,
  onOrbitalAdjustment,
  onEnergyShare,
  isActive = true
}: ConstellationGestureSystemProps) => {
  const [debug] = useDebug();
  const [constellationActions] = useState<ConstellationAction[]>([
    {
      id: 'orbital-adjust',
      type: 'orbital-adjust',
      title: 'Orbital Control',
      description: 'Circular gestures to adjust friend distances',
      icon: Orbit,
      gesture: 'circular-motion',
      activated: false
    },
    {
      id: 'constellation-create', 
      type: 'constellation-create',
      title: 'Group Constellation',
      description: 'Multi-touch to create friend groups',
      icon: Users,
      gesture: 'multi-touch',
      activated: false
    },
    {
      id: 'energy-share',
      type: 'energy-share',
      title: 'Share Energy',
      description: 'Swipe between friends to share vibes',
      icon: Zap,
      gesture: 'directional-swipe',
      activated: false
    },
    {
      id: 'group-plan',
      type: 'group-plan',
      title: 'Group Planning',
      description: 'Long press constellation to plan together',
      icon: Heart,
      gesture: 'long-press-constellation',
      activated: false
    },
    {
      id: 'temporal-view',
      type: 'temporal-view',
      title: 'Time Travel',
      description: 'Three-finger swipe to see constellation history',
      icon: RotateCcw,
      gesture: 'three-finger-swipe',
      activated: false
    }
  ]);

  const [gestureState, setGestureState] = useState<{
    isCircularMotion: boolean;
    touchPoints: number;
    swipeDirection: string | null;
    longPressTarget: string | null;
  }>({
    isCircularMotion: false,
    touchPoints: 0,
    swipeDirection: null,
    longPressTarget: null
  });

  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'info' | 'constellation';
  }>({ visible: false, message: '', type: 'info' });

  const { socialHaptics } = useHapticFeedback();

  const handleGesture = useCallback((gesture: any) => {
    if (!isActive) return;

    switch (gesture.type) {
      case 'circular-motion':
        if (gesture.intensity > 30) {
          const direction = gesture.clockwise ? 'expand' : 'contract';
          onOrbitalAdjustment?.(direction, gesture.intensity);
          socialHaptics.gestureConfirm();
          setNotification({
            visible: true,
            message: `🌌 ${direction === 'expand' ? 'Expanding' : 'Contracting'} constellation orbits`,
            type: 'constellation'
          });
        }
        break;

      case 'multi-touch':
        if (gesture.touchCount >= 3) {
          const action = constellationActions.find(a => a.type === 'constellation-create');
          if (action) {
            onConstellationAction?.(action);
            socialHaptics.connectionMade();
            setNotification({
              visible: true,
              message: '✨ Creating new friend constellation',
              type: 'success'
            });
          }
        }
        break;

      case 'directional-swipe':
        if (gesture.intensity > 80) {
          const action = constellationActions.find(a => a.type === 'energy-share');
          if (action) {
            onConstellationAction?.(action);
            // Simulate energy sharing between friends
            onEnergyShare?.('friend1', 'friend2', gesture.intensity);
            socialHaptics.gestureConfirm();
            setNotification({
              visible: true,
              message: '⚡ Sharing energy between friends',
              type: 'success'
            });
          }
        }
        break;

      case 'long-press':
        if (gesture.duration > 1500) {
          const action = constellationActions.find(a => a.type === 'group-plan');
          if (action) {
            onConstellationAction?.(action);
            socialHaptics.longPressActivated();
            setNotification({
              visible: true,
              message: '💫 Initiating constellation planning mode',
              type: 'constellation'
            });
          }
        }
        break;

      case 'three-finger-swipe':
        const action = constellationActions.find(a => a.type === 'temporal-view');
        if (action) {
          onConstellationAction?.(action);
          socialHaptics.timeShift();
          setNotification({
            visible: true,
            message: '⏰ Viewing constellation evolution over time',
            type: 'info'
          });
        }
        break;

      default:
        break;
    }
  }, [isActive, constellationActions, onConstellationAction, onOrbitalAdjustment, onEnergyShare, socialHaptics]);

  const { controls: { startListening, stopListening, isListening } } = useAdvancedGestures({
    onGesture: handleGesture,
    longPressDelay: 1000,
    swipeThreshold: 50
  });

  useEffect(() => {
    if (isActive) {
      startListening();
    } else {
      stopListening();
    }

    return () => stopListening();
  }, [isActive, startListening, stopListening]);

  // Auto-hide notifications
  useEffect(() => {
    if (notification.visible) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification.visible]);

  const showConstellationHelp = useCallback(() => {
    setNotification({
      visible: true,
      message: '🌌 Try: Circular motion for orbits, multi-touch for groups, swipe to share energy',
      type: 'constellation'
    });
  }, []);

  return (
    <>
      {/* Constellation Gesture Status */}
      {isActive && (
        <div className="fixed top-4 left-4" style={zIndex('uiControls')}>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-card/80 backdrop-blur-xl border border-border/30 ${
              isListening ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={showConstellationHelp}
          >
            <Orbit className={`w-4 h-4 ${isListening ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )}

      {/* Constellation Notification */}
      {notification.visible && (
        <div className="fixed top-20 right-4" style={zIndex('uiControls')}>
          <div className={`px-4 py-3 rounded-2xl backdrop-blur-xl border animate-fade-in max-w-xs ${
            notification.type === 'constellation' ? 'bg-primary/20 border-primary/30 text-primary' :
            notification.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
            'bg-card/90 border-border/30 text-foreground'
          }`}>
            <div className="text-sm font-medium">
              {notification.message}
            </div>
          </div>
        </div>
      )}

      {/* Constellation Action Palette (activated by specific gesture) */}
      {false && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl flex items-center justify-center" style={zIndex('modal')}>
          <div className="bg-card/95 backdrop-blur-xl rounded-3xl border border-border p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-center mb-4 text-primary">
              🌌 Constellation Controls
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {constellationActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="h-20 flex-col space-y-2 hover:border-primary/50"
                    onClick={() => onConstellationAction?.(action)}
                  >
                    <Icon className="w-6 h-6 text-primary" />
                    <span className="text-xs text-center">{action.title}</span>
                  </Button>
                );
              })}
            </div>
            <div className="mt-4 text-xs text-muted-foreground text-center">
              Use gestures naturally or tap these controls
            </div>
          </div>
        </div>
      )}

      {/* Live Gesture Debug */}
      {debug && (
        <div className="fixed bottom-20 right-4 max-w-xs" style={zIndex('uiControls')}>
          <div className="bg-card/80 backdrop-blur-xl rounded-lg border border-border/30 p-3">
            <div className="text-xs text-muted-foreground mb-2">Constellation Gestures:</div>
            <div className="text-xs text-foreground/70">
              <div>Circular: {gestureState.isCircularMotion ? '✓' : '○'}</div>
              <div>Touch Points: {gestureState.touchPoints}</div>
              <div>Swipe: {gestureState.swipeDirection || 'none'}</div>
              <div>Long Press: {gestureState.longPressTarget || 'none'}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};