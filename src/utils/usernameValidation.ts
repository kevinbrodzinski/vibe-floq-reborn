// Username validation constants - single source of truth
export const USERNAME_REGEX = /^[A-Za-z0-9_.-]{3,32}$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;

export const validateUsername = (username: string): {
  isValid: boolean;
  error?: string;
} => {
  if (!username.trim()) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.length < USERNAME_MIN_LENGTH) {
    return { isValid: false, error: `Username must be at least ${USERNAME_MIN_LENGTH} characters` };
  }
  
  if (username.length > USERNAME_MAX_LENGTH) {
    return { isValid: false, error: `Username must be no more than ${USERNAME_MAX_LENGTH} characters` };
  }
  
  if (!USERNAME_REGEX.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, dots, dashes, and underscores' };
  }
  
  return { isValid: true };
};