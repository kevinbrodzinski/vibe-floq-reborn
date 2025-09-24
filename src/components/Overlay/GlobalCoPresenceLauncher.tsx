import React, { useCallback, useMemo, useState } from 'react';
// Remove navigation imports for now since this is web-focused
// import { useNavigation, useNavigationState } from '@react-navigation/native';
import { SocialBattery } from '@/components/SocialBattery';
import { SocialBatteryIcon } from '@/components/SocialBattery';
import CoPresenceActions from '@/components/CoPresence/CoPresenceActions';
import { useRallyRoom } from '@/hooks/useRallyRoom';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { useRecommendationCapture } from '@/hooks/useRecommendationCapture';
import { openMeetHalfway } from '@/lib/events/coPresenceBus';
import { edgeLog } from '@/lib/edgeLog';

type Props = {
  hiddenOnRoutes?: string[];
  topOffset?: number;
  rightOffset?: number;
  minFullWidth?: number;
};

export default function GlobalCoPresenceLauncher({
  hiddenOnRoutes = ['Auth', 'Onboarding'],
  topOffset = 6,
  rightOffset = 8,
  minFullWidth = 380,
}: Props) {
  // For web deployment, simplified route detection
  const routeName = window?.location?.pathname?.split('/')[1] || '';
  const hidden = hiddenOnRoutes.some(route => routeName.toLowerCase().includes(route.toLowerCase()));
  const [open, setOpen] = useState(false);

  const { rows: friends = [] } = useUnifiedFriends();
  const participantsCount = (friends?.length ?? 0) + 1;

  const rally = useRallyRoom();
  const capture = useRecommendationCapture('balanced');

  const onRallyNow = useCallback(async () => {
    const id = await rally.create();
    await capture.setPlanContext({ planId: id, participantsCount });
    await capture.flushNow();
    edgeLog('rally_created', { rallyId: id, participantsCount });
    setOpen(false);
  }, [rally, capture, participantsCount]);

  const onMeetHalfway = useCallback(() => {
    openMeetHalfway();
    edgeLog('halfway_launch', {});
    setOpen(false);
  }, []);

  const styleOverlay = useMemo(() => ({
    position: 'fixed' as const,
    top: topOffset,
    right: rightOffset,
    zIndex: 9999,
    pointerEvents: 'none' as const,
  }), [topOffset, rightOffset]);

  if (hidden) return null;

  // For now, always use icon version since we're in React (not React Native)
  const useFull = false; // Change to width >= minFullWidth when you have width detection

  return (
    <>
      <div style={styleOverlay}>
        <div style={{ pointerEvents: 'auto' }}>
          {useFull ? (
            <SocialBattery
              envelope="balanced"
              onRallyNow={onRallyNow}
              onMeetHalfway={onMeetHalfway}
            />
          ) : (
            <SocialBatteryIcon onPress={() => setOpen(true)} />
          )}
        </div>
      </div>

      <CoPresenceActions
        visible={open}
        onClose={() => setOpen(false)}
        onRallyNow={onRallyNow}
        onMeetHalfway={onMeetHalfway}
      />
    </>
  );
}