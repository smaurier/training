# Notifications — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notifications locales hebdomadaires configurables (rappels séance) + inactivité (si aucune séance depuis X jours).

**Architecture:** `INotificationScheduler` (interface mockable) → `InMemoryNotificationScheduler` (tests) + `ExpoNotificationScheduler` (prod) → `NotificationService` (logique) → UI Réglages. Flux inactivité : schedule après séance, reschedule au lancement app.

**Tech Stack:** TypeScript strict, expo-notifications, Jest TDD, SQLiteSettingsRepository (existant)

**Spec:** `docs/superpowers/specs/2026-06-15-notifications.md`

---

### Task 1 : Installer expo-notifications

**Files:**
- Modify: `app/package.json` (via npm)

- [ ] **Step 1 : Installer**

```bash
cd app && npx expo install expo-notifications
```

- [ ] **Step 2 : Typecheck**

```bash
npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 3 : Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "chore(deps): install expo-notifications"
```

---

### Task 2 : INotificationScheduler + InMemoryNotificationScheduler

**Files:**
- Create: `app/services/INotificationScheduler.ts`
- Create: `app/services/InMemoryNotificationScheduler.ts`

- [ ] **Step 1 : Créer l'interface**

Créer `app/services/INotificationScheduler.ts` :

```typescript
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
```

- [ ] **Step 2 : Créer InMemoryNotificationScheduler**

Créer `app/services/InMemoryNotificationScheduler.ts` :

```typescript
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
```

- [ ] **Step 3 : Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
git add app/services/INotificationScheduler.ts app/services/InMemoryNotificationScheduler.ts
git commit -m "feat(notifications): INotificationScheduler + InMemoryNotificationScheduler"
```

---

### Task 3 : NotificationService (TDD)

**Files:**
- Create: `app/services/NotificationService.ts`
- Create: `app/services/NotificationService.test.ts`

- [ ] **Step 1 : Écrire les tests**

Créer `app/services/NotificationService.test.ts` :

```typescript
import { NotificationService } from './NotificationService';
import { InMemoryNotificationScheduler } from './InMemoryNotificationScheduler';
import { InMemorySettingsRepository } from '../repositories/InMemorySettingsRepository';

function make() {
  const scheduler = new InMemoryNotificationScheduler();
  const settings = new InMemorySettingsRepository();
  const svc = new NotificationService(scheduler, settings);
  return { svc, scheduler, settings };
}

describe('NotificationService', () => {
  describe('scheduleWeeklyReminders', () => {
    it('crée une notif REMINDER_* par jour coché', async () => {
      const { svc, scheduler } = make();
      await svc.scheduleWeeklyReminders([1, 3, 5], '18:00');
      const scheduled = await scheduler.getScheduled();
      const ids = scheduled.map(n => n.id);
      expect(ids).toContain('REMINDER_1');
      expect(ids).toContain('REMINDER_3');
      expect(ids).toContain('REMINDER_5');
      expect(ids).toHaveLength(3);
    });

    it('appelé 2x — pas de doublon (cancel avant reschedule)', async () => {
      const { svc, scheduler } = make();
      await svc.scheduleWeeklyReminders([1, 3], '18:00');
      await svc.scheduleWeeklyReminders([1, 5], '09:00');
      const scheduled = await scheduler.getScheduled();
      const ids = scheduled.map(n => n.id);
      expect(ids).not.toContain('REMINDER_3');
      expect(ids).toContain('REMINDER_1');
      expect(ids).toContain('REMINDER_5');
    });

    it('aucun jour coché — aucune notif REMINDER créée', async () => {
      const { svc, scheduler } = make();
      await svc.scheduleWeeklyReminders([], '18:00');
      expect(await scheduler.getScheduled()).toHaveLength(0);
    });
  });

  describe('scheduleInactivityCheck', () => {
    it('crée 1 notif INACTIVITY_CHECK dans thresholdDays jours', async () => {
      const { svc, scheduler } = make();
      const before = new Date();
      await svc.scheduleInactivityCheck(4);
      const scheduled = await scheduler.getScheduled();
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].id).toBe('INACTIVITY_CHECK');
      expect(scheduled[0].triggerType).toBe('once');
      const diff = (scheduled[0].date!.getTime() - before.getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBeCloseTo(4, 0);
    });

    it('appelé 2x — remplace la précédente', async () => {
      const { svc, scheduler } = make();
      await svc.scheduleInactivityCheck(4);
      await svc.scheduleInactivityCheck(7);
      const scheduled = await scheduler.getScheduled();
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].id).toBe('INACTIVITY_CHECK');
    });
  });

  describe('disable', () => {
    it('annule toutes les notifs', async () => {
      const { svc, scheduler } = make();
      await svc.scheduleWeeklyReminders([1, 3], '18:00');
      await svc.scheduleInactivityCheck(4);
      await svc.disable();
      expect(await scheduler.getScheduled()).toHaveLength(0);
    });
  });

  describe('enable', () => {
    it('retourne false si permission refusée, aucune notif créée', async () => {
      const { svc, scheduler } = make();
      (scheduler as InMemoryNotificationScheduler).setPermission(false);
      const result = await svc.enable();
      expect(result).toBe(false);
      expect(await scheduler.getScheduled()).toHaveLength(0);
    });

    it('retourne true si permission accordée', async () => {
      const { svc } = make();
      const result = await svc.enable();
      expect(result).toBe(true);
    });
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

```bash
cd app && npx jest NotificationService --no-coverage
```

Attendu : FAIL — module introuvable.

- [ ] **Step 3 : Créer NotificationService**

Créer `app/services/NotificationService.ts` :

```typescript
import type { INotificationScheduler } from './INotificationScheduler';
import type { ISettingsRepository } from '../repositories/ISettingsRepository';

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

// Conversion ISO (1=Lun…7=Dim) → Expo (1=Dim, 2=Lun…7=Sam)
function isoToExpoWeekday(isoDay: number): number {
  return (isoDay % 7) + 1;
}

export class NotificationService {
  constructor(
    private scheduler: INotificationScheduler,
    private settings: ISettingsRepository,
  ) {}

  async scheduleWeeklyReminders(days: number[], time: string): Promise<void> {
    // Cancel tous les rappels existants
    for (const day of ALL_WEEKDAYS) {
      await this.scheduler.cancel(`REMINDER_${day}`);
    }
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    for (const isoDay of days) {
      const expoWeekday = isoToExpoWeekday(isoDay);
      await this.scheduler.scheduleWeekly(
        `REMINDER_${isoDay}`,
        expoWeekday,
        hour,
        minute,
        "C'est l'heure de t'entraîner 💪",
      );
    }
  }

  async scheduleInactivityCheck(thresholdDays: number): Promise<void> {
    await this.scheduler.cancel('INACTIVITY_CHECK');
    const date = new Date();
    date.setDate(date.getDate() + thresholdDays);
    await this.scheduler.scheduleOnce(
      'INACTIVITY_CHECK',
      date,
      `Tu n'as pas encore fait de séance depuis ${thresholdDays} jours. On y va ?`,
    );
  }

  async cancelInactivityCheck(): Promise<void> {
    await this.scheduler.cancel('INACTIVITY_CHECK');
  }

  async applySettings(): Promise<void> {
    const [enabledVal, daysVal, timeVal, inactivityVal] = await Promise.all([
      this.settings.get('notifications_enabled'),
      this.settings.get('notification_days'),
      this.settings.get('notification_time'),
      this.settings.get('notification_inactivity_days'),
    ]);

    if (enabledVal !== '1') {
      await this.scheduler.cancelAll();
      return;
    }

    const days: number[] = daysVal ? JSON.parse(daysVal) : [];
    const time = timeVal ?? '18:00';
    await this.scheduleWeeklyReminders(days, time);

    const threshold = parseInt(inactivityVal ?? '0', 10);
    if (threshold > 0) {
      await this.scheduleInactivityCheck(threshold);
    } else {
      await this.cancelInactivityCheck();
    }
  }

  async enable(): Promise<boolean> {
    const granted = await this.scheduler.requestPermission();
    if (!granted) return false;
    await this.settings.set('notifications_enabled', '1');
    await this.applySettings();
    return true;
  }

  async disable(): Promise<void> {
    await this.scheduler.cancelAll();
    await this.settings.set('notifications_enabled', '0');
  }
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
cd app && npx jest NotificationService --no-coverage
```

Attendu : tous passent.

- [ ] **Step 5 : Commit**

```bash
git add app/services/NotificationService.ts app/services/NotificationService.test.ts
git commit -m "feat(NotificationService): TDD — rappels hebdo + inactivité"
```

---

### Task 4 : ExpoNotificationScheduler

**Files:**
- Create: `app/services/ExpoNotificationScheduler.ts`

- [ ] **Step 1 : Créer l'implémentation prod**

Créer `app/services/ExpoNotificationScheduler.ts` :

```typescript
import * as Notifications from 'expo-notifications';
import type { INotificationScheduler, ScheduledNotification } from './INotificationScheduler';

export class ExpoNotificationScheduler implements INotificationScheduler {
  async requestPermission(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async scheduleWeekly(id: string, weekday: number, hour: number, minute: number, body: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
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
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
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
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getScheduled(): Promise<ScheduledNotification[]> {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.map(n => ({
      id: n.identifier,
      body: n.content.body ?? '',
      triggerType: 'once' as const,
    }));
  }
}
```

- [ ] **Step 2 : Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 3 : Commit**

```bash
git add app/services/ExpoNotificationScheduler.ts
git commit -m "feat(notifications): ExpoNotificationScheduler — implémentation prod"
```

---

### Task 5 : Section NOTIFICATIONS dans Réglages

**Files:**
- Modify: `app/app/(tabs)/reglages.tsx`

- [ ] **Step 1 : Ajouter les imports**

En haut de `app/app/(tabs)/reglages.tsx`, ajouter :

```typescript
import { NotificationService } from '@/services/NotificationService';
import { ExpoNotificationScheduler } from '@/services/ExpoNotificationScheduler';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';
```

- [ ] **Step 2 : Ajouter le helper makeNotificationService**

Dans le composant, ajouter (après les autres constantes) :

```typescript
function makeNotificationService() {
  return new NotificationService(
    new ExpoNotificationScheduler(),
    new SQLiteSettingsRepository(getDb()),
  );
}
```

- [ ] **Step 3 : Ajouter les states notifications**

Dans le composant, ajouter :

```typescript
const DAYS_OPTIONS = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'Me' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 7, label: 'D' },
] as const;

const [notifEnabled, setNotifEnabled] = useState(false);
const [notifDays, setNotifDays] = useState<number[]>([]);
const [notifTime, setNotifTime] = useState('18:00');
const [notifInactivity, setNotifInactivity] = useState<'0' | '3' | '4' | '5' | '7'>('0');
const [notifPermissionDenied, setNotifPermissionDenied] = useState(false);

useEffect(() => {
  const repo = new SQLiteSettingsRepository(getDb());
  Promise.all([
    repo.get('notifications_enabled'),
    repo.get('notification_days'),
    repo.get('notification_time'),
    repo.get('notification_inactivity_days'),
  ]).then(([enabled, days, time, inactivity]) => {
    setNotifEnabled(enabled === '1');
    setNotifDays(days ? JSON.parse(days) : []);
    setNotifTime(time ?? '18:00');
    setNotifInactivity((inactivity as '0' | '3' | '4' | '5' | '7') ?? '0');
  }).catch(console.error);
}, []);

const handleNotifToggle = useCallback(async (value: boolean) => {
  const svc = makeNotificationService();
  if (value) {
    const granted = await svc.enable();
    if (!granted) { setNotifPermissionDenied(true); return; }
  } else {
    await svc.disable();
  }
  setNotifEnabled(value);
  setNotifPermissionDenied(false);
}, []);

const handleDayToggle = useCallback(async (day: number) => {
  const repo = new SQLiteSettingsRepository(getDb());
  const newDays = notifDays.includes(day)
    ? notifDays.filter(d => d !== day)
    : [...notifDays, day].sort();
  setNotifDays(newDays);
  await repo.set('notification_days', JSON.stringify(newDays));
  if (notifEnabled) {
    await makeNotificationService().applySettings();
  }
}, [notifDays, notifEnabled]);

const handleTimeChange = useCallback(async (time: string) => {
  const repo = new SQLiteSettingsRepository(getDb());
  setNotifTime(time);
  await repo.set('notification_time', time);
  if (notifEnabled) await makeNotificationService().applySettings();
}, [notifEnabled]);

const handleInactivityChange = useCallback(async (v: '0' | '3' | '4' | '5' | '7') => {
  const repo = new SQLiteSettingsRepository(getDb());
  setNotifInactivity(v);
  await repo.set('notification_inactivity_days', v);
  if (notifEnabled) await makeNotificationService().applySettings();
}, [notifEnabled]);
```

- [ ] **Step 4 : Ajouter la section dans le JSX**

Dans le return de `reglages.tsx`, avant la section DONNÉES, ajouter :

```tsx
<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>
<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
  {/* Toggle principal */}
  <View style={styles.settingRow}>
    <Text style={[styles.settingLabel, { color: colors.text }]}>Rappels d'entraînement</Text>
    <Switch
      value={notifEnabled}
      onValueChange={handleNotifToggle}
      trackColor={{ true: colors.primary }}
      accessibilityLabel="Activer les rappels d'entraînement"
    />
  </View>

  {notifPermissionDenied && (
    <Text style={[styles.permissionMsg, { color: colors.textSecondary }]}>
      Autorise les notifications dans les Réglages de ton téléphone.
    </Text>
  )}

  {notifEnabled && (
    <>
      {/* Jours */}
      <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Jours</Text>
      <View style={styles.daysRow}>
        {DAYS_OPTIONS.map(({ value, label }) => (
          <PressableA11y
            key={value}
            onPress={() => handleDayToggle(value)}
            style={[
              styles.dayChip,
              { borderColor: colors.border },
              notifDays.includes(value) && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            accessibilityLabel={`Jour ${label}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: notifDays.includes(value) }}
          >
            <Text style={[styles.dayChipText, { color: notifDays.includes(value) ? '#fff' : colors.text }]}>
              {label}
            </Text>
          </PressableA11y>
        ))}
      </View>

      {/* Heure */}
      <View style={styles.settingRow}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>Heure</Text>
        <TextInput
          style={[styles.timeInput, { color: colors.text, borderColor: colors.border }]}
          value={notifTime}
          onChangeText={handleTimeChange}
          placeholder="HH:MM"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="Heure du rappel"
        />
      </View>

      {/* Inactivité */}
      <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Rappel si inactif depuis</Text>
      <SegmentedControl
        options={[
          { value: '0', label: 'Jamais' },
          { value: '3', label: '3j' },
          { value: '4', label: '4j' },
          { value: '5', label: '5j' },
          { value: '7', label: '7j' },
        ]}
        selected={notifInactivity}
        onSelect={(v) => handleInactivityChange(v as '0' | '3' | '4' | '5' | '7')}
      />
    </>
  )}
</View>
```

Ajouter dans `StyleSheet.create` :

```typescript
settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
settingLabel: { fontSize: 15 },
subLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },
daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
dayChip: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
dayChipText: { fontSize: 12, fontWeight: '600' },
timeInput: { borderWidth: 1, borderRadius: 8, padding: 8, width: 80, textAlign: 'center', fontSize: 14 },
permissionMsg: { fontSize: 12, marginTop: 4, marginBottom: 8 },
```

- [ ] **Step 5 : Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 6 : Commit**

```bash
git add app/app/(tabs)/reglages.tsx
git commit -m "feat(reglages): section NOTIFICATIONS — toggle + jours + heure + inactivité"
```

---

### Task 6 : Reschedule inactivité au lancement (_layout.tsx)

**Files:**
- Modify: `app/app/_layout.tsx`

- [ ] **Step 1 : Ajouter l'import et le useEffect**

Dans `app/app/_layout.tsx`, ajouter les imports :

```typescript
import { NotificationService } from '@/services/NotificationService';
import { ExpoNotificationScheduler } from '@/services/ExpoNotificationScheduler';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { getDb } from '@/db';
```

Dans le composant racine, ajouter le useEffect (après les useEffects existants) :

```typescript
useEffect(() => {
  async function rescheduleInactivityIfNeeded() {
    const db = getDb();
    const settingsRepo = new SQLiteSettingsRepository(db);

    const [enabled, thresholdStr] = await Promise.all([
      settingsRepo.get('notifications_enabled'),
      settingsRepo.get('notification_inactivity_days'),
    ]);

    if (enabled !== '1') return;
    const threshold = parseInt(thresholdStr ?? '0', 10);
    if (threshold <= 0) return;

    // Vérifier date dernière séance completed
    const sessionRepo = new SQLiteSessionLogRepository(db);
    const sessions = await sessionRepo.findAll();
    const completed = sessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => b.started_at.localeCompare(a.started_at));

    if (completed.length === 0) return;

    const lastDate = new Date(completed[0].started_at);
    const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince < threshold) {
      // Utilisateur a été actif récemment — reschedule la notif inactivité
      const svc = new NotificationService(new ExpoNotificationScheduler(), settingsRepo);
      await svc.scheduleInactivityCheck(Math.ceil(threshold - daysSince));
    }
    // Si daysSince >= threshold : la notif a déjà dû firer — ne pas replanifier
  }

  rescheduleInactivityIfNeeded().catch(console.error);
}, []);
```

- [ ] **Step 2 : Vérifier que ISessionLogRepository a findAll**

```bash
grep "findAll" app/repositories/ISessionLogRepository.ts
```

Si `findAll` n'existe pas, utiliser une requête directe à la place :

```typescript
const db = getDb();
const rows = await db.getAllAsync<{ started_at: string; status: string }>(
  "SELECT started_at, status FROM session_logs WHERE status = 'completed' ORDER BY started_at DESC LIMIT 1",
);
if (rows.length === 0) return;
```

Adapter le useEffect selon le résultat.

- [ ] **Step 3 : Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
git add app/app/_layout.tsx
git commit -m "feat(_layout): reschedule notif inactivité au lancement si séance récente"
```

---

### Task 7 : Schedule inactivité après fin de séance

**Files:**
- Modify: `app/app/session/[workoutId].tsx`

- [ ] **Step 1 : Ajouter les imports**

Dans `app/app/session/[workoutId].tsx`, ajouter :

```typescript
import { NotificationService } from '@/services/NotificationService';
import { ExpoNotificationScheduler } from '@/services/ExpoNotificationScheduler';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';
import { getDb } from '@/db';
```

- [ ] **Step 2 : Modifier handleBack pour schedule l'inactivité**

Trouver `handleBack` (ligne ~218). Ajouter après `saveSessionMeta` et avant `router.back()` :

```typescript
const handleBack = useCallback(async () => {
  if (session.sessionLogId) {
    await SessionService // pattern existant
      .saveSessionMeta(session.sessionLogId, selectedTags, sessionNotes.trim() || null)
      .catch(console.error);
  }

  // Reschedule la notification d'inactivité
  try {
    const db = getDb();
    const settingsRepo = new SQLiteSettingsRepository(db);
    const [enabled, thresholdStr] = await Promise.all([
      settingsRepo.get('notifications_enabled'),
      settingsRepo.get('notification_inactivity_days'),
    ]);
    if (enabled === '1') {
      const threshold = parseInt(thresholdStr ?? '0', 10);
      if (threshold > 0) {
        const svc = new NotificationService(new ExpoNotificationScheduler(), settingsRepo);
        await svc.scheduleInactivityCheck(threshold);
      }
    }
  } catch {
    // silencieux — ne pas bloquer la navigation
  }

  router.back();
}, [session.sessionLogId, selectedTags, sessionNotes, router]);
```

Note : conserver la logique `saveSessionMeta` existante — ajouter seulement le bloc notifications après.

- [ ] **Step 3 : Typecheck + tests complets**

```bash
cd app && npm run typecheck && npx jest --no-coverage
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 4 : Commit**

```bash
git add app/app/session/[workoutId].tsx
git commit -m "feat(session): schedule notif inactivité après fin de séance"
```
