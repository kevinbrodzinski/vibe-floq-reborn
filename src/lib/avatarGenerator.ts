/**
 * Avatar generation utilities for creating default avatars with initials
 */

import { getInitials, getAvatarFallbackColor } from '@/lib/avatar';

/**
 * Generate an SVG avatar with initials and colored background
 */
export const generateInitialsAvatar = (
  displayName: string, 
  username: string,
  profileId: string,
  size: number = 128
): string => {
  const initials = getInitials(displayName, username);
  const backgroundColor = getAvatarFallbackColor(profileId);
  
  // Create SVG with initials
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${backgroundColor}" rx="${size / 8}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="${size * 0.4}" 
        font-weight="600" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="central"
      >
        ${initials}
      </text>
    </svg>
  `;

  // Convert SVG to data URL
  const encodedSvg = encodeURIComponent(svg);
  return `data:image/svg+xml,${encodedSvg}`;
};

/**
 * Generate a fallback avatar URL using external service as backup
 */
export const generateFallbackAvatar = (
  displayName: string,
  username: string,
  size: number = 128
): string => {
  const initials = getInitials(displayName, username);
  // Use UI Avatars as fallback service
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=random&color=fff&bold=true&format=svg`;
};

/**
 * Get default avatar - prioritizes SVG generation, falls back to external service
 */
export const getDefaultAvatar = (
  displayName: string,
  username: string, 
  profileId: string,
  size: number = 128
): string => {
  try {
    return generateInitialsAvatar(displayName, username, profileId, size);
  } catch (error) {
    console.warn('Failed to generate initials avatar, using fallback:', error);
    return generateFallbackAvatar(displayName, username, size);
  }
};