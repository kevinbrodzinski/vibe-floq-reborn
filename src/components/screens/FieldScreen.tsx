import { useEffect } from "react";
import { FieldDataProvider } from "./field/FieldDataProvider";
import { FieldLayout } from "./field/FieldLayout";
import { FieldGestureProvider } from "./field/FieldGestureProvider";

export const FieldScreen = () => {
  useEffect(() => {
    const handler = () => {
      const params = new URLSearchParams(window.location.search);
      params.delete('full');
      params.delete('view');
      history.replaceState(null, '', `?${params.toString()}`);
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
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