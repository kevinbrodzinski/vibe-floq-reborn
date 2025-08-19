import React from 'react';
import { Card, CardHeader, CardFooter, CardBackground, YStack, XStack, Text, Button, Image, Progress } from 'tamagui';

export type CurrentStopCardProps = {
  venueName: string;
  photoUrl?: string | null;
  vibePulse0to1?: number; // 0..1
  friendsHere?: number;
  onOnMyWay?: () => void;
  onHere?: () => void;
  onSkip?: () => void;
};

export default function CurrentStopCard(props: CurrentStopCardProps) {
  const { venueName, photoUrl, vibePulse0to1 = 0.5, friendsHere = 0, onOnMyWay, onHere, onSkip } = props;
  return (
    <Card elevation="$2" overflow="hidden">
      <CardBackground />
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} alt={venueName} width="100%" height={180} />
      ) : (
        <YStack height={180} ai="center" jc="center">
          <Text opacity={0.6}>Venue photo</Text>
        </YStack>
      )}
      <CardHeader>
        <Text fontSize="$7" fontWeight="700">{venueName}</Text>
        <XStack ai="center" gap="$3">
          <Text>Friends here: {friendsHere}</Text>
        </XStack>
      </CardHeader>
      <YStack paddingHorizontal="$4" paddingBottom="$3" gap="$2">
        <Text opacity={0.7}>Live vibe</Text>
        <Progress value={Math.round(vibePulse0to1 * 100)} max={100} />
      </YStack>
      <CardFooter>
        <XStack gap="$2">
          <Button onPress={onOnMyWay}>On my way</Button>
          <Button onPress={onHere} theme="active">I'm here</Button>
          <Button onPress={onSkip} theme="alt1">Skip</Button>
        </XStack>
      </CardFooter>
    </Card>
  );
}