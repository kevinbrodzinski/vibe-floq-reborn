/**
 * Design system token mappings for web platform
 * Routes through CSS custom properties from index.css
 */

export const getTokens = () => {
  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    colors: {
      background: computedStyle.getPropertyValue('--background').trim(),
      card: computedStyle.getPropertyValue('--card').trim(),
      border: computedStyle.getPropertyValue('--border').trim(),
      primary: computedStyle.getPropertyValue('--primary').trim(),
      muted: computedStyle.getPropertyValue('--muted').trim(),
      mutedForeground: computedStyle.getPropertyValue('--muted-foreground').trim(),
    },
    spacing: {
      xs: '0.5rem',
      sm: '1rem', 
      md: '1.5rem',
      lg: '2rem',
      xl: '3rem',
    },
    borderRadius: {
      sm: computedStyle.getPropertyValue('--radius').trim() || '0.5rem',
      md: '0.75rem',
      lg: '1rem',
    }
  };
};