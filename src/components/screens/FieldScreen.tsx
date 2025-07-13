import { useEffect } from "react";
import { FieldDataProvider } from "./field/FieldDataProvider";
import { FieldLayout } from "./field/FieldLayout";
import { FieldGestureProvider } from "./field/FieldGestureProvider";

export const FieldScreen = () => {
  // Clean up query params only when leaving Field route
  useEffect(() => {
    return () => {
      // Only clean up if we're still on a Field-related route
      if (!window.location.pathname.startsWith('/field')) {
        const params = new URLSearchParams(window.location.search);
        params.delete('full');
        params.delete('view');
        if (params.toString()) {
          history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
        } else {
          history.replaceState(null, '', window.location.pathname);
        }
      }
    };
  }, []);

  return (
    <FieldDataProvider>
      {(data) => (
        <FieldGestureProvider data={data}>
          <FieldLayout data={data} />
        </FieldGestureProvider>
      )}
    </FieldDataProvider>
  );
};