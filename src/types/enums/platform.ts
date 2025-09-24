import { z as zPlatform } from 'zod';

export const PlatformEnum = zPlatform.enum(['web', 'ios', 'android']);
export type Platform = zPlatform.infer<typeof PlatformEnum>;

export const safePlatform = (input: unknown): Platform => {
  const parsed = PlatformEnum.safeParse(input);
  return parsed.success ? parsed.data : 'web';
};