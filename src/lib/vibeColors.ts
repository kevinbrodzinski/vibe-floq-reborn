import tinycolor from 'tinycolor2';

type VibePalette = Record<string, string[]>;

export const getVibeColorPalette = (dominantVibe: string, baseColor?: string) => {
  const vibeColors: VibePalette = {
    energetic: ['#ff6b6b', '#ff8787', '#ffa8a8'],
    chill: ['#51cf66', '#69db7c', '#8ce99a'],
    focused: ['#339af0', '#74c0fc', '#a5d8ff'],
    social: ['#ffd43b', '#ffe066', '#ffec99'],
    creative: ['#da77f2', '#e599f7', '#eebefa'],
    adventurous: ['#ff922b', '#ffa94d', '#ffc078'],
    romantic: ['#f783ac', '#faa2c1', '#fcc2d7'],
    reflective: ['#868e96', '#adb5bd', '#ced4da'],
  };

  const colors = vibeColors[dominantVibe.toLowerCase()] || vibeColors.chill;
  
  if (baseColor) {
    const base = tinycolor(baseColor);
    return [
      base.toHexString(),
      base.lighten(10).toHexString(),
      base.lighten(20).toHexString(),
    ];
  }

  return colors;
};

export const generateCanvasGradient = (
  canvas: HTMLCanvasElement,
  colors: string[],
  time: number = 0,
  animate: boolean = true
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Reset transform to avoid accumulation on resize
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  // Create gradient (animated or static)
  const gradient = animate 
    ? ctx.createLinearGradient(
        Math.sin(time * 0.001) * width,
        Math.cos(time * 0.001) * height,
        width,
        height
      )
    : ctx.createLinearGradient(0, 0, width, height);

  colors.forEach((color, index) => {
    gradient.addColorStop(index / (colors.length - 1), color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width / window.devicePixelRatio, height / window.devicePixelRatio);
};