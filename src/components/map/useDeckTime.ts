
import { useFrame } from "@deck.gl/react";
import { useRef } from "react";

/**
 * Returns a stable ref whose `.current` value is the Deck GL timeline time
 * in milliseconds.  Using the ref means React never re-renders, while layers
 * can read a fresh timestamp every GPU frame.
 */
export const useDeckTime = () => {
  const t = useRef(0);

  // Called every frame by <DeckGL>
  useFrame(({ timeline }) => {
    t.current = timeline.next();          // ms since page load
  });

  return t;
};
