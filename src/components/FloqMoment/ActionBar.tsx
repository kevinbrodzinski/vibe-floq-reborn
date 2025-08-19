import React from 'react';
import { XStack, Button, Separator, YStack } from 'tamagui';

export type ActionBarProps = {
  onJoin?: () => void;
  onShareLocation?: () => void;
  onInvite?: () => void;
  onSaveRipple?: () => void;
};

export default function ActionBar({ onJoin, onShareLocation, onInvite, onSaveRipple }: ActionBarProps) {
  return (
    <YStack padding="$3" gap="$2" borderTopWidth={1} borderColor="$color2">
      <XStack gap="$2" fw="wrap">
        <Button onPress={onJoin}>Join Now</Button>
        <Button onPress={onShareLocation} theme="alt1">Share Location</Button>
        <Button onPress={onInvite} theme="alt2">Invite Friend</Button>
        <Button onPress={onSaveRipple} theme="active">Save as Ripple</Button>
      </XStack>
      <Separator />
    </YStack>
  );
}