export interface ScheduledNotification {
  id: string;
  body: string;
  triggerType: 'weekly' | 'once';
  weekday?: number;   // expo weekday : 1=Dim, 2=Lun … 7=Sam
  hour?: number;
  minute?: number;
  date?: Date;
}

export interface INotificationScheduler {
  requestPermission(): Promise<boolean>;
  scheduleWeekly(id: string, weekday: number, hour: number, minute: number, body: string): Promise<void>;
  scheduleOnce(id: string, date: Date, body: string): Promise<void>;
  cancel(id: string): Promise<void>;
  cancelAll(): Promise<void>;
  getScheduled(): Promise<ScheduledNotification[]>;  // pour tests
}
