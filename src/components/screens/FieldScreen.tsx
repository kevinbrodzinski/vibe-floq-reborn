import { useEffect } from "react";
import { FieldDataProvider } from "./field/FieldDataProvider";
import { FieldLayout } from "./field/FieldLayout";
import { FieldGestureProvider } from "./field/FieldGestureProvider";
import { useSyncedVisibility } from "@/hooks/useSyncedVisibility";

export const FieldScreen = () => {
  useSyncedVisibility(); // Sync visibility across app and devices

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      <FieldDataProvider>
        {(data) => (
          <FieldGestureProvider data={data}>
            <FieldLayout data={data} />
          </FieldGestureProvider>
        )}
      </FieldDataProvider>
    </div>
  );
};