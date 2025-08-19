import React, { useEffect, useMemo, useState } from 'react';
import { XStack, YStack, Text, Button, Separator } from 'tamagui';

export type MomentHeaderProps = {
  title: string;
  endsAt: string | Date; // ISO ok
  onBack?: () => void;
  onMore?: () => void;
};

function formatRemaining(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export default function MomentHeader({ title, endsAt, onBack, onMore }: MomentHeaderProps) {
  const target = useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, target - now);
  const dissolved = remaining <= 0;

  return (
    <YStack padding="$3" gap="$2">
      <XStack ai="center" jc="space-between">
        <Button size="$3" onPress={onBack} accessibilityLabel="Back">
          ←
        </Button>
        <Text fontWeight="700" fontSize="$7">{title}</Text>
        <Button size="$3" onPress={onMore} accessibilityLabel="More options">•••</Button>
      </XStack>
      <XStack ai="center" gap="$2">
        <Text fontSize="$6">{dissolved ? 'Ended' : formatRemaining(remaining)}</Text>
        <Text opacity={0.7}>Floq dissolves when timer ends</Text>
      </XStack>
      <Separator />
    </YStack>
  );
}