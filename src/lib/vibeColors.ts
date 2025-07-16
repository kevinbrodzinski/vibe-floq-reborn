import tinycolor from 'tinycolor2';

export const getVibeColorPalette = (dominantVibe: string, baseColor?: string) => {
  const vibeColors: Record<string, string[]> = {
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
  time: number = 0
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Create animated gradient
  const gradient = ctx.createLinearGradient(
    Math.sin(time * 0.001) * width,
    Math.cos(time * 0.001) * height,
    width,
    height
  );

  colors.forEach((color, index) => {
    gradient.addColorStop(index / (colors.length - 1), color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle noise/texture
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 10;
    data[i] += noise;     // R
    data[i + 1] += noise; // G
    data[i + 2] += noise; // B
  }

  ctx.putImageData(imageData, 0, 0);
};