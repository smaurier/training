# Décharge automatique — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Détecter automatiquement quand une semaine de décharge est opportune (calendaire, configurable) et suggérer la réduction de charge (-10%) à l'utilisateur via SummaryPhase + CheckInPhase.

**Architecture:** `DeloadService` (ISettingsRepository + ISessionLogRepository) + états locaux dans `[workoutId].tsx` + modifications CheckInPhase/SummaryPhase + section Réglages. Pas de migration DB — la table `settings` KV existe depuis v1.

**Tech Stack:** TypeScript strict, expo-sqlite, InMemory repos pour TDD, React Native StyleSheet.

---

## Fichiers

| Fichier | Action |
|---|---|
| `app/services/DeloadService.ts` | Créer |
| `app/services/DeloadService.test.ts` | Créer (TDD first) |
| `app/components/session/CheckInPhase.tsx` | Modifier — props `deloadSuggested?` + `onDeloadApplied?` + card |
| `app/components/session/SummaryPhase.tsx` | Modifier — prop `suggestNextDeload?` + card anticipation |
| `app/app/session/[workoutId].tsx` | Modifier — états + effets + exercises déchargés + bannière |
| `app/app/(tabs)/reglages.tsx` | Modifier — section décharge + segmented control 4/6/8 sem. |

---

## Task 1: DeloadService — TDD

**Files:**
- Create: `app/services/DeloadService.test.ts`
- Create: `app/services/DeloadService.ts`

- [ ] **Step 1: Écrire les tests**

Créer `app/services/DeloadService.test.ts` :

```typescript
import { DeloadService } from './DeloadService';
import { InMemorySettingsRepository } from '../repositories/InMemorySettingsRepository';
import { InMemorySessionLogRepository } from '../repositories/InMemorySessionLogRepository';

const WORKOUT_ID = 1;

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

async function makeService(overrides?: {
  lastDeloadAt?: string;
  deloadWeeks?: string;
}) {
  const settingsRepo = new InMemorySettingsRepository();
  const sessionLogRepo = new InMemorySessionLogRepository();
  if (overrides?.lastDeloadAt) {
    await settingsRepo.set('last_deload_at', overrides.lastDeloadAt);
  }
  if (overrides?.deloadWeeks) {
    await settingsRepo.set('deload_weeks', overrides.deloadWeeks);
  }
  return { service: new DeloadService(settingsRepo, sessionLogRepo), settingsRepo, sessionLogRepo };
}

describe('DeloadService — shouldSuggestDeload', () => {
  it('retourne false si aucune séance et aucune décharge', async () => {
    const { service } = await makeService();
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(false);
  });

  it('retourne false si première séance il y a moins de 4 semaines (27 jours)', async () => {
    const { service, sessionLogRepo } = await makeService();
    const s = await sessionLogRepo.save({
      workout_id: WORKOUT_ID, started_at: daysAgo(27),
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.complete(s.id, daysAgo(27));
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(false);
  });

  it('retourne true si première séance il y a 28+ jours et aucune décharge', async () => {
    const { service, sessionLogRepo } = await makeService();
    const s = await sessionLogRepo.save({
      workout_id: WORKOUT_ID, started_at: daysAgo(28),
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.complete(s.id, daysAgo(28));
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(true);
  });

  it('retourne false si dernière décharge il y a 27 jours', async () => {
    const { service } = await makeService({ lastDeloadAt: daysAgo(27) });
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(false);
  });

  it('retourne true si dernière décharge il y a 28+ jours', async () => {
    const { service } = await makeService({ lastDeloadAt: daysAgo(28) });
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(true);
  });

  it('respecte deload_weeks personnalisé (6 semaines = 42 jours)', async () => {
    const { service } = await makeService({ lastDeloadAt: daysAgo(35), deloadWeeks: '6' });
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(false);
  });

  it('retourne true avec deload_weeks=6 si dernière décharge il y a 42+ jours', async () => {
    const { service } = await makeService({ lastDeloadAt: daysAgo(42), deloadWeeks: '6' });
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(true);
  });

  it('utilise la séance la plus ancienne si aucune décharge enregistrée', async () => {
    const { service, sessionLogRepo } = await makeService();
    // séance ancienne (30 jours) + séance récente (5 jours) pour le même workout
    const s1 = await sessionLogRepo.save({
      workout_id: WORKOUT_ID, started_at: daysAgo(30),
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.complete(s1.id, daysAgo(30));
    const s2 = await sessionLogRepo.save({
      workout_id: WORKOUT_ID, started_at: daysAgo(5),
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.complete(s2.id, daysAgo(5));
    // 30 >= 28 → true
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(true);
  });

  it('ignore les séances abandonnées pour la date de référence', async () => {
    const { service, sessionLogRepo } = await makeService();
    // séance abandonnée ancienne (30 jours)
    const s1 = await sessionLogRepo.save({
      workout_id: WORKOUT_ID, started_at: daysAgo(30),
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.abandon(s1.id, daysAgo(30));
    // séance complétée récente (5 jours) → ref = 5 jours < 28 → false
    const s2 = await sessionLogRepo.save({
      workout_id: WORKOUT_ID, started_at: daysAgo(5),
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.complete(s2.id, daysAgo(5));
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(false);
  });
});

describe('DeloadService — recordDeload', () => {
  it('enregistre last_deload_at dans settings', async () => {
    const { service, settingsRepo } = await makeService();
    const now = new Date().toISOString();
    await service.recordDeload(now);
    expect(await settingsRepo.get('last_deload_at')).toBe(now);
  });
});

describe('DeloadService — getDeloadWeeks', () => {
  it('retourne 4 par défaut', async () => {
    const { service } = await makeService();
    expect(await service.getDeloadWeeks()).toBe(4);
  });

  it('retourne la valeur configurée', async () => {
    const { service } = await makeService({ deloadWeeks: '6' });
    expect(await service.getDeloadWeeks()).toBe(6);
  });
});
```

- [ ] **Step 2: Lancer les tests — vérifier échec**

```
cd C:\Users\sylva\projects\training-app\app && npx jest DeloadService --no-coverage
```

Attendu : FAIL — `Cannot find module './DeloadService'`

- [ ] **Step 3: Implémenter `DeloadService`**

Créer `app/services/DeloadService.ts` :

```typescript
import { applyDeload } from './progression';
import type { ISettingsRepository } from '../repositories/ISettingsRepository';
import type { ISessionLogRepository } from '../repositories/ISessionLogRepository';
import type { WorkoutExerciseDetail } from './WorkoutExerciseService';

export class DeloadService {
  constructor(
    private settingsRepo: ISettingsRepository,
    private sessionLogRepo: ISessionLogRepository,
  ) {}

  async getDeloadWeeks(): Promise<number> {
    const raw = await this.settingsRepo.get('deload_weeks');
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return isNaN(parsed) ? 4 : parsed;
  }

  async shouldSuggestDeload(workoutId: number): Promise<boolean> {
    const deloadWeeks = await this.getDeloadWeeks();
    const thresholdMs = deloadWeeks * 7 * 24 * 60 * 60 * 1000;

    const lastDeloadAt = await this.settingsRepo.get('last_deload_at');
    if (lastDeloadAt) {
      return Date.now() - new Date(lastDeloadAt).getTime() >= thresholdMs;
    }

    const sessions = await this.sessionLogRepo.findByWorkoutId(workoutId);
    const completed = sessions.filter(s => s.status === 'completed');
    if (completed.length === 0) return false;

    const earliest = completed.reduce((a, b) =>
      a.started_at < b.started_at ? a : b
    );
    return Date.now() - new Date(earliest.started_at).getTime() >= thresholdMs;
  }

  async recordDeload(date: string): Promise<void> {
    await this.settingsRepo.set('last_deload_at', date);
  }
}

export function applyDeloadToExercises(
  exercises: WorkoutExerciseDetail[],
): WorkoutExerciseDetail[] {
  return exercises.map(ex => ({
    ...ex,
    blocks: ex.blocks.map(block => ({
      ...block,
      sets: block.sets.map(set => ({
        ...set,
        weight: set.weight !== null && set.weight_type !== 'bodyweight'
          ? applyDeload(set.weight)
          : set.weight,
      })),
    })),
  }));
}
```

- [ ] **Step 4: Lancer les tests — vérifier passage**

```
cd C:\Users\sylva\projects\training-app\app && npx jest DeloadService --no-coverage
```

Attendu : 10/10 PASS

- [ ] **Step 5: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add app/services/DeloadService.ts app/services/DeloadService.test.ts
git -C C:\Users\sylva\projects\training-app commit -m "feat(deload): DeloadService TDD — shouldSuggestDeload + recordDeload + applyDeloadToExercises"
```

---

## Task 2: CheckInPhase — card décharge

**Files:**
- Modify: `app/components/session/CheckInPhase.tsx`

- [ ] **Step 1: Ajouter les props**

Dans `app/components/session/CheckInPhase.tsx`, mettre à jour l'interface :

```typescript
interface CheckInPhaseProps {
  onStart: (checkin: CheckIn) => Promise<void>;
  exercises: WorkoutExerciseDetail[];
  deloadSuggested?: boolean;
  onDeloadApplied?: () => void;
}

export function CheckInPhase({ onStart, exercises, deloadSuggested, onDeloadApplied }: CheckInPhaseProps) {
```

- [ ] **Step 2: Ajouter l'état local `deloadAccepted`**

Après les `useState` existants (energy, fatigue, sleep, loading) :

```typescript
const [deloadAccepted, setDeloadAccepted] = useState(false);
const [deloadDismissed, setDeloadDismissed] = useState(false);
```

- [ ] **Step 3: Ajouter la card décharge dans le JSX**

Insérer **avant** les rangées check-in (avant le premier `{CHECKIN_ROWS.map(...)}`), dans le `ScrollView` :

```tsx
{deloadSuggested && !deloadDismissed && (
  <View style={[styles.deloadCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.deloadTitle, { color: colors.text }]}>
      {deloadAccepted ? 'Décharge appliquée ✓' : 'Semaine de décharge suggérée'}
    </Text>
    {!deloadAccepted && (
      <Text style={[styles.deloadBody, { color: colors.textSecondary }]}>
        Après plusieurs semaines d'entraînement, une semaine à charge réduite (-10%) permet aux muscles et tendons de récupérer et de repartir plus forts.
      </Text>
    )}
    {!deloadAccepted && (
      <View style={styles.deloadButtons}>
        <PressableA11y
          accessibilityLabel="Appliquer la décharge — poids réduits de 10% pour cette séance"
          onPress={() => {
            setDeloadAccepted(true);
            onDeloadApplied?.();
          }}
          style={[styles.deloadBtn, styles.deloadBtnPrimary, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.deloadBtnPrimaryText}>Appliquer la décharge</Text>
        </PressableA11y>
        <PressableA11y
          accessibilityLabel="Passer — continuer sans décharge"
          onPress={() => setDeloadDismissed(true)}
          style={[styles.deloadBtn, styles.deloadBtnSecondary, { borderColor: colors.border }]}
        >
          <Text style={[styles.deloadBtnSecondaryText, { color: colors.text }]}>Passer</Text>
        </PressableA11y>
      </View>
    )}
  </View>
)}
```

- [ ] **Step 4: Ajouter les styles**

Dans `StyleSheet.create({...})` :

```typescript
deloadCard: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 12, marginBottom: 8 },
deloadTitle: { fontSize: 15, fontWeight: '600' },
deloadBody: { fontSize: 14, lineHeight: 20 },
deloadButtons: { flexDirection: 'column', gap: 8 },
deloadBtn: { paddingVertical: 12, borderRadius: Radius.sm, alignItems: 'center' },
deloadBtnPrimary: {},
deloadBtnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
deloadBtnSecondary: { borderWidth: 1 },
deloadBtnSecondaryText: { fontSize: 15 },
```

- [ ] **Step 5: Vérifier TypeScript + commit**

```
cd C:\Users\sylva\projects\training-app\app && npm run typecheck
```

Attendu : 0 erreurs.

```bash
git -C C:\Users\sylva\projects\training-app add app/components/session/CheckInPhase.tsx
git -C C:\Users\sylva\projects\training-app commit -m "feat(CheckInPhase): card décharge — suggestion + appliquer/passer"
```

---

## Task 3: SummaryPhase — card anticipation décharge

**Files:**
- Modify: `app/components/session/SummaryPhase.tsx`

- [ ] **Step 1: Ajouter la prop `suggestNextDeload`**

Dans `app/components/session/SummaryPhase.tsx`, mettre à jour l'interface et la signature :

```typescript
interface SummaryPhaseProps {
  progressions: ProgressionResult[];
  totalSets: number;
  durationSeconds: number;
  totalVolumeKg?: number;
  plateaus?: PlateauResult[];
  suggestNextDeload?: boolean;
  onClose: () => void;
}

export function SummaryPhase({ progressions, totalSets, durationSeconds, totalVolumeKg, plateaus, suggestNextDeload, onClose }: SummaryPhaseProps) {
```

- [ ] **Step 2: Ajouter la card dans le JSX**

Insérer **après** la card plateaux existante, **avant** le bouton closeBtn :

```tsx
{suggestNextDeload && (
  <View style={[styles.deloadHintSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>Bientôt une semaine de décharge</Text>
    <Text style={[styles.deloadHintBody, { color: colors.textSecondary }]}>
      Tu t'entraînes depuis 4+ semaines. À la prochaine séance, pense à décharger — les poids seront réduits de 10% pour que tes muscles récupèrent.
    </Text>
  </View>
)}
```

- [ ] **Step 3: Ajouter les styles**

Dans `StyleSheet.create({...})` :

```typescript
deloadHintSection: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 8 },
deloadHintBody: { fontSize: 13, lineHeight: 18 },
```

- [ ] **Step 4: Vérifier TypeScript + commit**

```
cd C:\Users\sylva\projects\training-app\app && npm run typecheck
```

Attendu : 0 erreurs.

```bash
git -C C:\Users\sylva\projects\training-app add app/components/session/SummaryPhase.tsx
git -C C:\Users\sylva\projects\training-app commit -m "feat(SummaryPhase): card anticipation décharge — suggestion prochaine séance"
```

---

## Task 4: Intégration dans `[workoutId].tsx`

**Files:**
- Modify: `app/app/session/[workoutId].tsx`

- [ ] **Step 1: Ajouter les imports**

Après les imports SQLite existants, ajouter :

```typescript
import { DeloadService, applyDeloadToExercises } from '@/services/DeloadService';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';
```

- [ ] **Step 2: Ajouter les états et l'effet de détection dans `SessionContent`**

Après `const [summaryDurationSeconds, setSummaryDurationSeconds] = useState(0);` (ligne ~166) :

```typescript
const [deloadSuggested, setDeloadSuggested] = useState(false);
const [isDeloadSession, setIsDeloadSession] = useState(false);

useEffect(() => {
  const db = getDb();
  const service = new DeloadService(
    new SQLiteSettingsRepository(db),
    new SQLiteSessionLogRepository(db),
  );
  service.shouldSuggestDeload(workoutId).then(setDeloadSuggested).catch(console.error);
}, [workoutId]);
```

- [ ] **Step 3: Appliquer la décharge aux exercises**

Remplacer :

```typescript
const resolvedExercises = useMemo(() => exercises.map(resolveWeights), [exercises]);
const session = useSession(workoutId, resolvedExercises, initialSession);
```

Par :

```typescript
const resolvedExercises = useMemo(() => exercises.map(resolveWeights), [exercises]);
const deloadedExercises = useMemo(
  () => isDeloadSession ? applyDeloadToExercises(resolvedExercises) : resolvedExercises,
  [isDeloadSession, resolvedExercises],
);
const session = useSession(workoutId, deloadedExercises, initialSession);
```

- [ ] **Step 4: Enregistrer la décharge en fin de séance**

Après l'effet des `plateaus` (ligne ~184), ajouter :

```typescript
useEffect(() => {
  if (session.phase !== 'summary' || !session.sessionLogId || !isDeloadSession) return;
  const db = getDb();
  const service = new DeloadService(
    new SQLiteSettingsRepository(db),
    new SQLiteSessionLogRepository(db),
  );
  service.recordDeload(new Date().toISOString()).catch(console.error);
}, [session.phase, session.sessionLogId, isDeloadSession]);
```

- [ ] **Step 5: Bannière décharge dans RunningPhase**

Trouver le bloc `{!session.error && session.phase === 'running' && ...}` (ligne ~266). Juste **avant** `<RunningPhase ...` (pas avant le bloc entier, mais en haut de la View principale) ajouter un indicateur visuel. Envelopper le contenu running existant :

```tsx
{!session.error && session.phase === 'running' && session.currentSet && session.currentBlock && session.currentExercise && (
  <>
    {isDeloadSession && (
      <View style={[styles.deloadBanner, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.deloadBannerText, { color: colors.textSecondary }]}>Séance décharge</Text>
      </View>
    )}
    {needsStartingWeight ? (
      <ExerciseStartingWeightPhase ... />
    ) : (
      <RunningPhase ... />
    )}
  </>
)}
```

Remplacer le bloc `{!session.error && session.phase === 'running' ...}` existant entièrement par ce nouveau bloc.

- [ ] **Step 6: Câbler les props CheckInPhase et SummaryPhase**

Remplacer :

```tsx
{!session.error && session.phase === 'checkin' && (
  <CheckInPhase onStart={session.startSession} exercises={resolvedExercises} />
)}
```

Par :

```tsx
{!session.error && session.phase === 'checkin' && (
  <CheckInPhase
    onStart={session.startSession}
    exercises={resolvedExercises}
    deloadSuggested={deloadSuggested}
    onDeloadApplied={() => setIsDeloadSession(true)}
  />
)}
```

Remplacer :

```tsx
{!session.error && session.phase === 'summary' && (
  <SummaryPhase
    progressions={session.progressions}
    totalSets={session.totalSetsLogged}
    durationSeconds={summaryDurationSeconds}
    totalVolumeKg={session.totalVolume}
    plateaus={plateaus}
    onClose={handleBack}
  />
)}
```

Par :

```tsx
{!session.error && session.phase === 'summary' && (
  <SummaryPhase
    progressions={session.progressions}
    totalSets={session.totalSetsLogged}
    durationSeconds={summaryDurationSeconds}
    totalVolumeKg={session.totalVolume}
    plateaus={plateaus}
    suggestNextDeload={deloadSuggested && !isDeloadSession}
    onClose={handleBack}
  />
)}
```

- [ ] **Step 7: Ajouter les styles bannière**

Dans `StyleSheet.create({...})` :

```typescript
deloadBanner: {
  paddingHorizontal: 16,
  paddingVertical: 6,
  borderBottomWidth: 1,
  alignItems: 'center',
},
deloadBannerText: { fontSize: 12, fontWeight: '500', letterSpacing: 0.5 },
```

- [ ] **Step 8: Vérifier TypeScript + tests complets + commit**

```
cd C:\Users\sylva\projects\training-app\app && npm run typecheck
```

Attendu : 0 erreurs.

```
npx jest --no-coverage
```

Attendu : toutes suites passent.

```bash
git -C C:\Users\sylva\projects\training-app add app/app/session/[workoutId].tsx
git -C C:\Users\sylva\projects\training-app commit -m "feat(session): intégrer DeloadService — détection + flag isDeloadSession + poids déchargés + record"
```

---

## Task 5: Réglages — configuration deload_weeks

**Files:**
- Modify: `app/app/(tabs)/reglages.tsx`

- [ ] **Step 1: Ajouter l'import**

Après les imports existants :

```typescript
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';
```

- [ ] **Step 2: Ajouter état + chargement**

Dans le composant principal (après les useState existants) :

```typescript
const [deloadWeeks, setDeloadWeeksState] = useState<4 | 6 | 8>(4);

useEffect(() => {
  const repo = new SQLiteSettingsRepository(getDb());
  repo.get('deload_weeks').then(v => {
    const n = parseInt(v ?? '4', 10);
    if (n === 6 || n === 8) setDeloadWeeksState(n as 4 | 6 | 8);
  }).catch(console.error);
}, []);

const handleDeloadWeeksChange = useCallback(async (v: 4 | 6 | 8) => {
  setDeloadWeeksState(v);
  const repo = new SQLiteSettingsRepository(getDb());
  await repo.set('deload_weeks', String(v));
}, []);
```

- [ ] **Step 3: Ajouter la section dans le JSX**

Dans le `ScrollView`, après la section Unités existante :

```tsx
<View style={[styles.section, { borderColor: colors.border }]}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Décharge automatique</Text>
  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
    Semaines avant de suggérer une semaine de décharge
  </Text>
  <SegmentedControl
    options={[
      { value: 4 as const, label: '4 sem.' },
      { value: 6 as const, label: '6 sem.' },
      { value: 8 as const, label: '8 sem.' },
    ]}
    selected={deloadWeeks}
    onSelect={handleDeloadWeeksChange}
    colors={colors}
    isDark={colorScheme === 'dark'}
  />
</View>
```

Note: `SegmentedControl` est déjà défini dans `reglages.tsx` avec `T extends string`. Il faut l'adapter à `T extends string | number`, ou utiliser `String(v)` comme valeur et parser à l'affichage. Voir variante ci-dessous si le générique pose problème :

Variante : définir les options avec valeurs string :

```typescript
const DELOAD_OPTIONS: { value: '4' | '6' | '8'; label: string }[] = [
  { value: '4', label: '4 sem.' },
  { value: '6', label: '6 sem.' },
  { value: '8', label: '8 sem.' },
];
```

Et adapter `handleDeloadWeeksChange` :

```typescript
const handleDeloadWeeksChange = useCallback(async (v: '4' | '6' | '8') => {
  setDeloadWeeksState(parseInt(v, 10) as 4 | 6 | 8);
  const repo = new SQLiteSettingsRepository(getDb());
  await repo.set('deload_weeks', v);
}, []);
```

Avec state `deloadWeeksStr`:
```typescript
const [deloadWeeksStr, setDeloadWeeksStr] = useState<'4' | '6' | '8'>('4');
// dans useEffect: setDeloadWeeksStr((n === 6 ? '6' : n === 8 ? '8' : '4'));
```

Choisir la variante string pour compatibilité avec le générique existant.

- [ ] **Step 4: Vérifier TypeScript + commit**

```
cd C:\Users\sylva\projects\training-app\app && npm run typecheck
```

Attendu : 0 erreurs.

```bash
git -C C:\Users\sylva\projects\training-app add app/app/(tabs)/reglages.tsx
git -C C:\Users\sylva\projects\training-app commit -m "feat(reglages): config décharge automatique — segmented control 4/6/8 semaines"
```
