import * as Notifications from 'expo-notifications';
import type {
  NotificationTrigger,
  WeeklyNotificationTrigger,
  CalendarNotificationTrigger,
} from 'expo-notifications';

import type { INotificationScheduler, ScheduledNotification } from './INotificationScheduler';

function isWeeklyTrigger(t: unknown): t is WeeklyNotificationTrigger {
  return (t as WeeklyNotificationTrigger)?.type === 'weekly';
}

function isCalendarTrigger(t: unknown): t is CalendarNotificationTrigger {
  return (t as CalendarNotificationTrigger)?.type === 'calendar';
}

export class ExpoNotificationScheduler implements INotificationScheduler {
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async scheduleWeekly(
    id: string,
    weekday: number,
    hour: number,
    minute: number,
    body: string,
  ): Promise<void> {
    await this.cancel(id);
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title: 'Trace', body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      },
    });
  }

  async scheduleOnce(id: string, date: Date, body: string): Promise<void> {
    await this.cancel(id);
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title: 'Trace', body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  }

  async cancel(id: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(id);
  }

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getScheduled(): Promise<ScheduledNotification[]> {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.map((n) => {
      const trigger = n.trigger;
      const base = {
        id: n.identifier,
        body: n.content.body ?? '',
      };

      if (trigger === null) {
        return { ...base, triggerType: 'once' as const };
      }

      // Weekly trigger (Android)
      if (isWeeklyTrigger(trigger)) {
        return {
          ...base,
          triggerType: 'weekly' as const,
          weekday: trigger.weekday,
          hour: trigger.hour,
          minute: trigger.minute,
        };
      }

      // iOS maps weekly → calendar trigger with weekday + repeats
      if (isCalendarTrigger(trigger) && trigger.dateComponents.weekday !== undefined) {
        return {
          ...base,
          triggerType: 'weekly' as const,
          weekday: trigger.dateComponents.weekday,
          hour: trigger.dateComponents.hour,
          minute: trigger.dateComponents.minute,
        };
      }

      return { ...base, triggerType: 'once' as const };
    });
  }
}
