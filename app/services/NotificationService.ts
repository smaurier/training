import type { INotificationScheduler } from './INotificationScheduler';

export type NotifSettings = {
  enabled: boolean;
  isoWeekday: number;   // 1=Lun … 7=Dim (ISO)
  hour: number;
  minute: number;
  inactivityDays: number;
};

/** ISO weekday (1=Mon…7=Sun) → Expo weekday (1=Sun, 2=Mon…7=Sat) */
function toExpoWeekday(isoDay: number): number {
  return (isoDay % 7) + 1;
}

export class NotificationService {
  constructor(
    private scheduler: INotificationScheduler,
    private getSettingsFn: () => Promise<NotifSettings | null>,
    private saveSettingsFn: (s: NotifSettings) => Promise<void>,
  ) {}

  async getSettings(): Promise<NotifSettings | null> {
    return this.getSettingsFn();
  }

  async saveAndReschedule(settings: NotifSettings): Promise<void> {
    await this.saveSettingsFn(settings);
    await this.scheduler.cancelAll();

    if (!settings.enabled) return;

    const granted = await this.scheduler.requestPermission();
    if (!granted) return;

    const expoWeekday = toExpoWeekday(settings.isoWeekday);
    await this.scheduler.scheduleWeekly(
      'weekly-reminder',
      expoWeekday,
      settings.hour,
      settings.minute,
      "C'est l'heure de t'entraîner 💪",
    );
  }

  async scheduleInactivityCheck(lastSessionDate: Date | null): Promise<void> {
    if (lastSessionDate === null) {
      await this.scheduler.cancel('inactivity-check');
      return;
    }

    const settings = await this.getSettingsFn();
    if (settings === null || !settings.enabled) return;

    const nowMs = Date.now();
    const diffDays = (nowMs - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays >= settings.inactivityDays) {
      // Already overdue — don't re-notify
      await this.scheduler.cancel('inactivity-check');
      return;
    }

    const fireDate = new Date(lastSessionDate.getTime() + settings.inactivityDays * 24 * 60 * 60 * 1000);
    const body = `Tu n'as pas fait de séance depuis ${settings.inactivityDays} jours. C'est le moment de reprendre 💪`;
    await this.scheduler.scheduleOnce('inactivity-check', fireDate, body);
  }

  async cancelAll(): Promise<void> {
    await this.scheduler.cancelAll();
  }
}
