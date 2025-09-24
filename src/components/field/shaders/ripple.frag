varying vec2 vTextureCoord;
uniform vec4 uColor;
uniform float uTime;

void main() {
  float dist = length(vTextureCoord - 0.5);
  float alpha = smoothstep(0.4, 0.0, dist + mod(uTime, 1.0) * 0.4);
  gl_FragColor = vec4(uColor.rgb, alpha * uColor.a);
}