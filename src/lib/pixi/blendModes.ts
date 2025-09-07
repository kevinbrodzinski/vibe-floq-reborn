import * as PIXI from 'pixi.js';

// Blend mode helper for PIXI version compatibility
export const ADD_BLEND = (PIXI as any)?.BLEND_MODES?.ADD ?? ('add' as any);
export const NORMAL_BLEND = (PIXI as any)?.BLEND_MODES?.NORMAL ?? ('normal' as any);