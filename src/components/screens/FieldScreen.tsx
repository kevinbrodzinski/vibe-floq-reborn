import { useEffect } from "react";
import { FieldDataProvider } from "./field/FieldDataProvider";
import { FieldLayout } from "./field/FieldLayout";
import { FieldGestureProvider } from "./field/FieldGestureProvider";

export const FieldScreen = () => {

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