import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, ClipPath } from 'react-native-svg';

export default function Bolt({
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
        <LinearGradient id="gBolt" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={accent} stopOpacity={0.6} />
          <Stop offset="1" stopColor={accent} stopOpacity={1} />
        </LinearGradient>
        <ClipPath id="clipBolt">
          <Rect x="0" y={clipY} width="100" height={fillH} />
        </ClipPath>
      </Defs>

      {/* Capsule outline */}
      <Path
        d="M50 4 C73 4 90 18 90 40 V60 C90 82 73 96 50 96 C27 96 10 82 10 60 V40 C10 18 27 4 50 4 Z"
        stroke={accent}
        strokeOpacity={0.18}
        strokeWidth={3}
        fill="none"
      />

      {/* Bolt body (filled via clip) */}
      <Path
        d="M58 18 L38 52 H50 L42 82 L68 46 H56 L58 18 Z"
        fill="url(#gBolt)"
        clipPath="url(#clipBolt)"
      />
    </Svg>
  );
}