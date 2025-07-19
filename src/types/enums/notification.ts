import { z as zNotif } from 'zod';

export const NotificationTypeEnum = zNotif.enum([
  'invite',
  'mention',
  'reaction',
  'rsvp',
  'reminder',
  'achievement',
  'comment',
  'system'
]);
export type NotificationType = zNotif.infer<typeof NotificationTypeEnum>;