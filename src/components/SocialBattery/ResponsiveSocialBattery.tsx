import React from 'react';
import { useWindowDimensions } from 'react-native';
import MetamorphBattery from '@/components/SocialBattery/MetamorphBattery';
import { SocialBatteryIcon } from '@/components/SocialBatteryIcon';
import { openMeetHalfway } from '@/lib/events/coPresenceBus';

type Props = {
  floqId?: string;
  minFullWidth?: number;                 // default 380
  envelope?: 'strict'|'balanced'|'permissive';
  size?: number;
};

export default function ResponsiveSocialBattery({
  floqId,
  minFullWidth = 380,
  envelope = 'balanced',
  size = 52,
}: Props) {
  const { width } = useWindowDimensions();
  const openHalfway = () => openMeetHalfway({ floqId });

  const full = width >= minFullWidth;

  return full ? (
    <MetamorphBattery
      envelope={envelope}
      size={size}
      onPress={openHalfway}  // open Meet-Halfway via bus
    />
  ) : (
    <SocialBatteryIcon
      envelope={envelope}
      size={28}
      onPress={openHalfway}  // open Meet-Halfway via bus
    />
  );
}