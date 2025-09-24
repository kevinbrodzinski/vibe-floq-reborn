/**
 * Development-only logging utility
 * Avoids string interpolation in production builds
 */
export const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

export const devError = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(...args);
  }
};

export const devWarn = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(...args);
  }
};