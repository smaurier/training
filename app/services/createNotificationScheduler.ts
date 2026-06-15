import Constants from 'expo-constants';
import { InMemoryNotificationScheduler } from './InMemoryNotificationScheduler';
import type { INotificationScheduler } from './INotificationScheduler';

export function createNotificationScheduler(): INotificationScheduler {
  if (Constants.appOwnership === 'expo') {
    return new InMemoryNotificationScheduler();
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ExpoNotificationScheduler } = require('./ExpoNotificationScheduler');
  return new ExpoNotificationScheduler() as INotificationScheduler;
}
