// Minimal OKLab mixing (Björn Ottosson), hex in/out
type Lab = { L:number;a:number;b:number }
const srgbToLinear = (u:number)=> u<=0.04045 ? u/12.92 : Math.pow((u+0.055)/1.055,2.4);
const linearToSrgb = (u:number)=> u<=0.0031308?12.92*u:1.055*Math.pow(u,1/2.4)-0.055;

function hexToRgb(hex:string):[number,number,number] {
  const h=hex.replace('#',''); const n=h.length===3?h.split('').map(c=>c+c).join(''):h;
  return [parseInt(n.slice(0,2),16)/255, parseInt(n.slice(2,4),16)/255, parseInt(n.slice(4,6),16)/255];
}
function rgbToHex([r,g,b]:[number,number,number]) {
  const t=(v:number)=>Math.max(0,Math.min(255,Math.round(v*255))).toString(16).padStart(2,'0');
  return `#${t(r)}${t(g)}${t(b)}`;
}
function rgbToOklab([R,G,B]:[number,number,number]):Lab{
  const r=srgbToLinear(R), g=srgbToLinear(G), b=srgbToLinear(B);
  const l=0.4122214708*r+0.5363325363*g+0.0514459929*b;
  const m=0.2119034982*r+0.6806995451*g+0.1073969566*b;
  const s=0.0883024619*r+0.2817188376*g+0.6299787005*b;
  const l_=Math.cbrt(l), m_=Math.cbrt(m), s_=Math.cbrt(s);
  return { L:0.2104542553*l_+0.7936177850*m_-0.0040720468*s_, a:1.9779984951*l_-2.4285922050*m_+0.4505937099*s_, b:0.0259040371*l_+0.7827717662*m_-0.8086757660*s_ };
}
function oklabToRgb({L,a,b}:Lab):[number,number,number]{
  const l_=Math.pow(L+0.3963377774*a+0.2158037573*b,3),
        m_=Math.pow(L-0.1055613458*a-0.0638541728*b,3),
        s_=Math.pow(L-0.0894841775*a-1.2914855480*b,3);
  const r= 4.0767416621*l_ -3.3077115913*m_ +0.2309699292*s_;
  const g=-1.2684380046*l_ +2.6097574011*m_ -0.3413193965*s_;
  const bC=0.0041960863*l_ -0.7034186147*m_ +1.6990628590*s_;
  return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(bC)];
}
export function mixHexOklab(aHex:string,bHex:string,t:number){
  const a=rgbToOklab(hexToRgb(aHex)), b=rgbToOklab(hexToRgb(bHex));
  return rgbToHex(oklabToRgb({ L:a.L+(b.L-a.L)*t, a:a.a+(b.a-a.a)*t, b:a.b+(b.b-a.b)*t }));
}
export function gradientStops(userHex:string, venueHex:string){
  // 0→user, 1→venue (tweakable stops)
  return [[0.00,userHex],[0.35,userHex],[0.65,venueHex],[1.00,venueHex]] as Array<[number,string]>;
}