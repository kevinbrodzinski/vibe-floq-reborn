import React, { useMemo } from 'react';
import { useFieldUI } from '@/components/field/contexts/FieldUIContext';
import { FieldVisualization } from '@/components/screens/field/FieldVisualization';

// Shim: Assuming FieldUILayer composes FieldVisualization with props
// This wrapper demonstrates applying vibe filter upstream if a selected vibe exists in UI context.

export const FieldUILayer: React.FC<any> = (props) => {
  const ui = useFieldUI?.();
  const activeVibe = ui?.filters?.vibe as string | undefined;

  const filteredFriends = useMemo(() => {
    const friends = props?.data?.friends || props?.friends || [];
    if (!activeVibe) return friends;
    return friends.filter((f: any) => (f.vibe ?? '') === activeVibe);
  }, [props?.data?.friends, props?.friends, activeVibe]);

  return (
    <div className="pointer-events-none">
      <FieldVisualization
        {...props}
        friends={filteredFriends}
      />
    </div>
  );
};