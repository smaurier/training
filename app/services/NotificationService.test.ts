import { NotificationService } from './NotificationService';
import { InMemoryNotificationScheduler } from './InMemoryNotificationScheduler';
import type { NotifSettings } from './NotificationService';

describe('NotificationService', () => {
  let scheduler: InMemoryNotificationScheduler;
  let settings: NotifSettings | null;
  let service: NotificationService;

  const defaultSettings: NotifSettings = {
    enabled: true,
    isoWeekday: 1,   // Lundi
    hour: 9,
    minute: 0,
    inactivityDays: 7,
  };

  beforeEach(() => {
    scheduler = new InMemoryNotificationScheduler();
    settings = null;
    service = new NotificationService(
      scheduler,
      async () => settings,
      async (s) => { settings = s; },
    );
  });

  describe('saveAndReschedule', () => {
    it('saves settings and schedules weekly', async () => {
      await service.saveAndReschedule(defaultSettings);
      expect(settings).toEqual(defaultSettings);
      const scheduled = await scheduler.getScheduled();
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].id).toBe('weekly-reminder');
      expect(scheduled[0].weekday).toBe(2); // lundi ISO 1 → expo 2
    });

    it('ne planifie pas si désactivé', async () => {
      await service.saveAndReschedule({ ...defaultSettings, enabled: false });
      expect(await scheduler.getScheduled()).toHaveLength(0);
    });

    it('ne planifie pas si permission refusée', async () => {
      scheduler.setPermission(false);
      await service.saveAndReschedule(defaultSettings);
      expect(await scheduler.getScheduled()).toHaveLength(0);
    });

    it('annule les anciennes notifs avant de replanifier', async () => {
      await service.saveAndReschedule(defaultSettings);
      await service.saveAndReschedule({ ...defaultSettings, hour: 10 });
      const scheduled = await scheduler.getScheduled();
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].hour).toBe(10);
    });
  });

  describe('scheduleInactivityCheck', () => {
    it('annule si aucune séance', async () => {
      await scheduler.scheduleOnce('inactivity-check', new Date(), 'test');
      await service.scheduleInactivityCheck(null);
      expect((await scheduler.getScheduled()).find(n => n.id === 'inactivity-check')).toBeUndefined();
    });

    it('planifie dans le futur si séance récente', async () => {
      settings = defaultSettings;
      const lastSession = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // il y a 2 jours
      await service.scheduleInactivityCheck(lastSession);
      const scheduled = await scheduler.getScheduled();
      const inactivity = scheduled.find(n => n.id === 'inactivity-check');
      expect(inactivity).toBeDefined();
      expect(inactivity!.triggerType).toBe('once');
    });

    it('n\'annule pas si déjà en retard (diff >= inactivityDays)', async () => {
      settings = defaultSettings;
      const lastSession = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // il y a 10 jours
      await service.scheduleInactivityCheck(lastSession);
      const inactivity = (await scheduler.getScheduled()).find(n => n.id === 'inactivity-check');
      expect(inactivity).toBeUndefined();
    });

    it('le body de la notif inactivité ne punit pas l\'absence', async () => {
      settings = defaultSettings;
      const lastSession = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      await service.scheduleInactivityCheck(lastSession);
      const scheduled = await scheduler.getScheduled();
      const inactivity = scheduled.find(n => n.id === 'inactivity-check');
      expect(inactivity).toBeDefined();
      expect(inactivity!.body).not.toMatch(/n'as pas fait/i);
      expect(inactivity!.body).not.toMatch(/depuis.*jours/i);
    });
  });
});
