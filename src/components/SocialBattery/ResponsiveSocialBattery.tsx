import React, { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import MetamorphBattery from '@/components/SocialBattery/MetamorphBattery';
import { SocialBatteryIcon } from '@/components/SocialBattery';
import { openMeetHalfway } from '@/lib/events/coPresenceBus';

type Props = {
  floqId?: string;
  /** px width at which we show the full Metamorph battery instead of the icon */
  minFullWidth?: number;             // default 380
  envelope?: 'strict'|'balanced'|'permissive';

  /** design tokens — keep token-first */
  accent?: string;                   // e.g., 'var(--color-primary)'
  surface?: string;                  // e.g., 'var(--surface-glass)'
  onPrimary?: string;                // e.g., 'var(--on-surface)'
  border?: string;                   // e.g., 'var(--border-muted)'

  /** override: custom press handler (fallback opens Meet-Halfway via bus) */
  onPress?: () => void;
};

export default function ResponsiveSocialBattery({
  floqId,
  minFullWidth = 380,
  envelope = 'balanced',
  accent   = 'var(--color-primary)',
  surface  = 'var(--surface-glass)',
  onPrimary= 'var(--on-surface)',
  border   = 'var(--border-muted)',
  onPress,
}: Props) {
  const { width } = useWindowDimensions();

  const handlePress = useCallback(() => {
    if (onPress) return onPress();
    openMeetHalfway({ floqId });                 // default: open your Meet-Halfway sheet
  }, [onPress, floqId]);

  const useFull = width >= minFullWidth;

  return useFull ? (
    <MetamorphBattery
      size={52}
      envelope={envelope}
      accent={accent}
      surface={surface}
      onPrimary={onPrimary}
      border={border}
      onPress={handlePress}
    />
  ) : (
    <SocialBatteryIcon
      size={28}
      envelope={envelope}
      accent={accent}
      surface={surface}
      border={border}
      onPress={handlePress}
    />
  );
}