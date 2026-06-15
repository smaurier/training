import type { INotificationScheduler, ScheduledNotification } from './INotificationScheduler';

export class InMemoryNotificationScheduler implements INotificationScheduler {
  private notifications: Map<string, ScheduledNotification> = new Map();
  private permissionGranted = true;

  setPermission(granted: boolean) { this.permissionGranted = granted; }

  async requestPermission(): Promise<boolean> {
    return this.permissionGranted;
  }

  async scheduleWeekly(id: string, weekday: number, hour: number, minute: number, body: string): Promise<void> {
    this.notifications.set(id, { id, body, triggerType: 'weekly', weekday, hour, minute });
  }

  async scheduleOnce(id: string, date: Date, body: string): Promise<void> {
    this.notifications.set(id, { id, body, triggerType: 'once', date });
  }

  async cancel(id: string): Promise<void> {
    this.notifications.delete(id);
  }

  async cancelAll(): Promise<void> {
    this.notifications.clear();
  }

  async getScheduled(): Promise<ScheduledNotification[]> {
    return Array.from(this.notifications.values());
  }
}
