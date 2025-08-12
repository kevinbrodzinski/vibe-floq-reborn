// src/lib/tokens/grayscale.ts
// Design-token adapter for grayscale. Prefer wiring to your token source.
// If you have a tokens package, replace the map below with imports.
// The keys should match your neutral/grayscale token names.

export type UiGrayToken =
  | 'gray-1' | 'gray-2' | 'gray-3' | 'gray-4' | 'gray-5' | 'gray-6'
  | 'gray-7' | 'gray-8' | 'gray-9' | 'gray-10' | 'gray-11' | 'gray-12';

// RGB triplets [0..255]. Replace with real token values from your DS if available.
export const GRAY_RGB: Record<UiGrayToken, [number, number, number]> = {
  'gray-1' : [250, 250, 250],
  'gray-2' : [240, 240, 240],
  'gray-3' : [228, 228, 231],
  'gray-4' : [212, 212, 216],
  'gray-5' : [163, 163, 163],
  'gray-6' : [115, 115, 115],
  'gray-7' : [82,  82,  82 ],
  'gray-8' : [64,  64,  64 ],
  'gray-9' : [55,  55,  55 ],
  'gray-10': [39,  39,  42 ],
  'gray-11': [24,  24,  27 ],
  'gray-12': [15,  15,  18 ],
};