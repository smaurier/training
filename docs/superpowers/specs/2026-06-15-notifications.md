# Notifications — Design

## Contexte

Deux types de notifications locales pour maintenir l'adhérence sans mécaniques punitives :
1. **Rappels séance** : notifications hebdomadaires récurrentes aux jours/heure configurés
2. **Inactivité** : notification unique si aucune séance depuis X jours

Philosophie : rappeler sans culpabiliser. Pas de streak, pas de compteur d'absences affiché.

---

## Décisions de design

| Sujet | Décision | Raison |
|---|---|---|
| Rappels | Jours/heure fixes, pas basés sur le programme | Programme = rotation, pas calendrier. Calendrier programme = scope énorme. |
| Inactivité | Schedule après séance, cancel/reschedule au lancement app | Pas de background tasks iOS. Pattern standard local notifications. |
| Config | KV settings (pattern plate_step) | Cohérent avec le reste de l'app |
| Testabilité | `INotificationScheduler` injectable | Appels natifs expo-notifications mockables en tests |
| Limite iOS | WeeklyTrigger = 1 notif par jour coché (récurrente) + 1 inactivité = ≤ 8 notifs | Bien en dessous de la limite iOS 64 |

---

## Settings KV

| Clé | Valeurs | Défaut |
|---|---|---|
| `notifications_enabled` | `'0'` / `'1'` | `'0'` |
| `notification_days` | JSON `'[1,3,5]'` (1=Lun … 7=Dim ISO) | `'[]'` |
| `notification_time` | `'HH:MM'` | `'18:00'` |
| `notification_inactivity_days` | `'3'` / `'4'` / `'5'` / `'7'` / `'0'` (désactivé) | `'0'` |

---

## Architecture

### Interface : `INotificationScheduler`

```typescript
interface INotificationScheduler {
  requestPermission(): Promise<boolean>;
  scheduleWeekly(id: string, dayOfWeek: number, hour: number, minute: number, body: string): Promise<void>;
  scheduleOnce(id: string, date: Date, body: string): Promise<void>;
  cancel(id: string): Promise<void>;
  cancelAll(): Promise<void>;
}
```

Implémentation prod : `ExpoNotificationScheduler` (wraps `expo-notifications`).
Implémentation test : `InMemoryNotificationScheduler`.

### Service : `NotificationService`

```typescript
class NotificationService {
  constructor(private scheduler: INotificationScheduler, private settingsRepo: ISettingsRepository) {}

  async scheduleWeeklyReminders(days: number[], time: string): Promise<void>
  // Cancel toutes les notifs REMINDER_*, reschedule une par jour coché

  async scheduleInactivityCheck(thresholdDays: number): Promise<void>
  // Cancel INACTIVITY_*, schedule 1 notif pour now + thresholdDays

  async cancelInactivityCheck(): Promise<void>

  async applySettings(): Promise<void>
  // Lit KV → applique scheduleWeeklyReminders + scheduleInactivityCheck ou cancelAll

  async enable(): Promise<boolean>
  // requestPermission → si accordé : sauver enabled='1' + applySettings, retourner true
  // si refusé : retourner false (UI affiche message)

  async disable(): Promise<void>
  // cancelAll + sauver enabled='0'
}
```

### IDs de notifications

- Rappels : `REMINDER_${dayOfWeek}` (ex: `REMINDER_1`, `REMINDER_3`)
- Inactivité : `INACTIVITY_CHECK`

---

## Flux inactivité

```
Session complétée (SummaryPhase "Terminer")
  → NotificationService.scheduleInactivityCheck(thresholdDays)
  → cancel INACTIVITY_CHECK existant
  → schedule nouveau INACTIVITY_CHECK pour now + thresholdDays jours

App lancée (_layout.tsx useEffect)
  → si notifications_enabled='1' && inactivity_days > 0
  → getLatestCompletedSession() → si < thresholdDays → reschedule
  → si >= thresholdDays → laisser la notif existante (elle a déjà dû firer ou va firer)
```

---

## UI — Réglages (section NOTIFICATIONS)

```
┌─ NOTIFICATIONS ──────────────────────────────┐
│ Rappels d'entraînement          [Toggle ON]  │
│                                              │
│ Jours                                        │
│ [L] [M] [Me] [J] [V] [S] [D]               │
│                                              │
│ Heure                           [18:00 ▾]   │
│                                              │
│ Rappel si inactif depuis                     │
│ [Désactivé] [3j] [4j] [5j] [7j]            │
└──────────────────────────────────────────────┘
```

- Toggle OFF → `NotificationService.disable()` → cache les options
- Toggle ON → `NotificationService.enable()` → si permission refusée → affiche "Autorise les notifications dans les Réglages de ton téléphone"
- Modification jours/heure/inactivité → `NotificationService.applySettings()` immédiatement

---

## Intégration dans le flow séance

- `[workoutId].tsx` — fin de séance (handleBack après summary) → `NotificationService.scheduleInactivityCheck(thresholdDays)` si activé

---

## Fichiers touchés

### Nouveau
- `app/services/NotificationService.ts`
- `app/services/NotificationService.test.ts`
- `app/services/INotificationScheduler.ts`
- `app/services/InMemoryNotificationScheduler.ts`
- `app/services/ExpoNotificationScheduler.ts`

### Modifié
- `app/app/(tabs)/reglages.tsx` — section NOTIFICATIONS
- `app/app/[workoutId].tsx` — appel scheduleInactivityCheck en fin de séance
- `app/app/_layout.tsx` — reschedule inactivité au lancement

### Package à installer
- `expo-notifications`

---

## Tests TDD

### `NotificationService.test.ts` (avec InMemoryNotificationScheduler)
- `scheduleWeeklyReminders([1,3,5], '18:00')` → 3 notifs REMINDER_* créées
- `scheduleWeeklyReminders` appelé 2x → pas de doublon (cancel avant reschedule)
- `scheduleInactivityCheck(4)` → 1 notif INACTIVITY_CHECK schedulée dans 4 jours
- `scheduleInactivityCheck` appelé 2x → remplace la précédente
- `disable()` → toutes les notifs annulées
- `enable()` quand permission refusée → retourne false, aucune notif créée

---

## Hors scope

- Notifications push (serveur) — pas d'infrastructure
- Notification "nouveau PR" in-app → déjà un badge overlay en séance
- Rappels basés sur le calendrier programme
- Snooze / actions sur la notification
