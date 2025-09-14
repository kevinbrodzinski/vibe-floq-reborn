// Unified vibe color helpers (web & PIXI)
// - vibe -> CSS hex/rgb
// - HSL/OKLab mixing for gradients
// - PIXI numeric color

import type { Vibe } from "@/lib/vibes";
import { VIBE_RGB } from "@/lib/vibes";

// ---------- helpers: number <-> color ----------
const rgbToHex = ([r,g,b]:[number,number,number]) =>
  `#${[r,g,b].map(v=>Math.max(0,Math.min(255, v|0)).toString(16).padStart(2,'0')).join('')}`;
export const vibeToRgb = (vibe: Vibe): [number,number,number] => VIBE_RGB[vibe];
export const vibeToHex = (vibe: Vibe) => rgbToHex(vibeToRgb(vibe));

// Micro cache for repeated PIXI conversions (performance)
const pixiCache = new Map<Vibe, number>();
export const vibeToPixi = (vibe: Vibe) => {
  const hit = pixiCache.get(vibe);
  if (hit !== undefined) return hit;
  const [r,g,b] = vibeToRgb(vibe);
  const val = (r << 16) + (g << 8) + b;
  pixiCache.set(vibe, val);
  return val;
};

// ---------- OKLab mixing (perceptual) ----------
type Lab = { L:number; a:number; b:number };
const srgbToLinear = (u:number)=> (u<=0.04045? u/12.92 : Math.pow((u+0.055)/1.055,2.4));
const linearToSrgb = (u:number)=> (u<=0.0031308? 12.92*u : 1.055*Math.pow(u,1/2.4)-0.055);
const rgbToOklab = ([R,G,B]:[number,number,number]):Lab=>{
  const r=srgbToLinear(R/255), g=srgbToLinear(G/255), b=srgbToLinear(B/255);
  const l=0.4122214708*r+0.5363325363*g+0.0514459929*b;
  const m=0.2119034982*r+0.6806995451*g+0.1073969566*b;
  const s=0.0883024619*r+0.2817188376*g+0.6299787005*b;
  const l_=Math.cbrt(l), m_=Math.cbrt(m), s_=Math.cbrt(s);
  return { L:0.2104542553*l_+0.7936177850*m_-0.0040720468*s_,
           a:1.9779984951*l_-2.4285922050*m_+0.4505937099*s_,
           b:0.0259040371*l_+0.7827717662*m_-0.8086757660*s_ };
};
const oklabToRgb = ({L,a,b}:Lab):[number,number,number]=>{
  const l_=Math.pow(L+0.3963377774*a+0.2158037573*b,3);
  const m_=Math.pow(L-0.1055613458*a-0.0638541728*b,3);
  const s_=Math.pow(L-0.0894841775*a-1.2914855480*b,3);
  const r=linearToSrgb( 4.0767416621*l_-3.3077115913*m_+0.2309699292*s_);
  const g=linearToSrgb(-1.2684380046*l_+2.6097574011*m_-0.3413193965*s_);
  const bl=linearToSrgb( 0.0041960863*l_-0.7034186147*m_+1.6990628590*s_);
  return [Math.round(r*255), Math.round(g*255), Math.round(bl*255)];
};
export const mixHexOklab = (aHex:string, bHex:string, t:number) => {
  const hexToRgb = (h:string):[number,number,number] => {
    const s=h.replace('#',''); const n=s.length===3? s.split('').map(c=>c+c).join('') : s;
    return [parseInt(n.slice(0,2),16), parseInt(n.slice(2,4),16), parseInt(n.slice(4,6),16)];
  };
  const a = rgbToOklab(hexToRgb(aHex)), b = rgbToOklab(hexToRgb(bHex));
  return rgbToHex(oklabToRgb({
    L: a.L + (b.L - a.L) * t,
    a: a.a + (b.a - a.a) * t,
    b: a.b + (b.b - a.b) * t
  }));
};

// ---------- simple 4-stop gradient (user->venue) ----------
export const gradientStops = (fromHex:string, toHex:string) => ([
  [0.00, fromHex],
  [0.35, fromHex],
  [0.65, toHex],
  [1.00, toHex],
] as Array<[number,string]>);