import React, { useMemo } from 'react';
import Svg, { Circle } from 'react-native-svg';

export default function Sparks({
  size = 52,
  accent = 'hsl(var(--primary))',
  count = 5,
}:{
  size?: number;
  accent?: string;
  count?: number;
}) {
  const pts = useMemo(() => {
    const arr: {x:number;y:number;r:number;o:number}[] = [];
    for (let i=0;i<count;i++){
      const x = size*0.55 + Math.random()*size*0.25;
      const y = size*0.15 + Math.random()*size*0.25;
      const r = Math.max(0.6, Math.random()*1.4);
      const o = 0.35 + Math.random()*0.35;
      arr.push({x,y,r,o});
    }
    return arr;
  }, [size, count]);

  return (
    <Svg width={size} height={size} style={{ position:'absolute', left:0, top:0 }}>
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={accent} opacity={p.o}/>
      ))}
    </Svg>
  );
}