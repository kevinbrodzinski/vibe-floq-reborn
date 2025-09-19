import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, ClipPath } from 'react-native-svg';

export default function Droplet({
  size = 52,
  energy01,
  accent = 'var(--color-primary)',
}:{
  size?: number;
  energy01: number;
  accent?: string;
}) {
  const vb = 100;
  const e = Math.max(0, Math.min(1, energy01));
  const fillH = e * vb;
  const clipY = vb - fillH;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="gDrop" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={accent} stopOpacity={0.6} />
          <Stop offset="1" stopColor={accent} stopOpacity={1} />
        </LinearGradient>
        <ClipPath id="clipDrop">
          <Rect x="0" y={clipY} width="100" height={fillH} />
        </ClipPath>
      </Defs>

      {/* Outline */}
      <Path
        d="M50 6 C60 22 76 36 76 58 C76 77 64 92 50 92 C36 92 24 77 24 58 C24 36 40 22 50 6 Z"
        stroke={accent}
        strokeOpacity={0.18}
        strokeWidth={3}
        fill="none"
      />

      {/* Fill */}
      <Path
        d="M50 6 C60 22 76 36 76 58 C76 77 64 92 50 92 C36 92 24 77 24 58 C24 36 40 22 50 6 Z"
        fill="url(#gDrop)"
        clipPath="url(#clipDrop)"
      />
    </Svg>
  );
}