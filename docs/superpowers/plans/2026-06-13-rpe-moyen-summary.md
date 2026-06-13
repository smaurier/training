# RPE Moyen en SummaryPhase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher l'effort ressenti moyen de la séance ("47 min · Effort : Normal") dans le hero de SummaryPhase, calculé à partir des votes RPE déjà enregistrés par set dans `set_logs.rpe`.

**Architecture:** `SessionService.getSessionRPELabel(sessionLogId)` lit les set_logs via `findBySessionLogId` (déjà dans l'interface), filtre les RPE non null, calcule la moyenne, retourne un label ou null. `[workoutId].tsx` appelle la méthode via `makeServiceForCheck()` au passage en phase `summary` (même pattern que `detectPlateaus`). `SummaryPhase` reçoit `rpeLabel` et l'affiche inline avec la durée.

**Tech Stack:** React Native, Expo SDK 54, TypeScript strict, expo-sqlite, Jest

---

## Fichiers

| Fichier | Action |
|---|---|
| `app/services/SessionService.ts` | Modifier — ajouter `getSessionRPELabel` |
| `app/services/SessionService.test.ts` | Modifier — ajouter 5 tests TDD |
| `app/app/session/[workoutId].tsx` | Modifier — state + useEffect + prop |
| `app/components/session/SummaryPhase.tsx` | Modifier — prop + affichage inline |

---

### Task 1 : `SessionService.getSessionRPELabel` (TDD)

**Files:**
- Modify: `app/services/SessionService.ts`
- Modify: `app/services/SessionService.test.ts`

**Contexte :**
- `makeService()` dans le fichier test retourne `{ sessionLogRepo, setLogRepo, ..., build() }` — `build()` construit le `SessionService`
- `ctx.setLogRepo.save(dto)` permet d'insérer des set_logs directement sans créer de session d'abord
- `CreateSetLogDto` requiert : `session_log_id`, `set_id`, `exercise_id`, `reps_done`, `weight_done`, `rpe` (number | null), `completed_at` (ISO string)
- `duration_seconds` et `distance_meters` sont optionnels dans le DTO
- Valeurs RPE dans l'app : Facile = 3, Normal = 6, Difficile = 9
- Mapping : `< 4.5` → `'Facile'`, `4.5` à `< 7.5` → `'Normal'`, `≥ 7.5` → `'Difficile'`

- [ ] **Step 1 : Écrire les tests (RED)**

Ajouter le bloc `describe` suivant à la fin de `app/services/SessionService.test.ts` (à l'intérieur du module, après les autres `describe`) :

```typescript
describe('SessionService.getSessionRPELabel', () => {
  it('retourne null si aucun set pour la session', async () => {
    const ctx = makeService();
    const service = ctx.build();
    expect(await service.getSessionRPELabel(1)).toBeNull();
  });

  it('retourne null si tous les sets ont rpe null', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await ctx.setLogRepo.save({
      session_log_id: 1, set_id: 1, exercise_id: 1,
      reps_done: 10, weight_done: 50, rpe: null,
      completed_at: '2026-05-01T10:00:00.000Z',
    });
    expect(await service.getSessionRPELabel(1)).toBeNull();
  });

  it('retourne "Facile" si moyenne RPE < 4.5 (tous à 3)', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await ctx.setLogRepo.save({
      session_log_id: 1, set_id: 1, exercise_id: 1,
      reps_done: 10, weight_done: 50, rpe: 3,
      completed_at: '2026-05-01T10:00:00.000Z',
    });
    await ctx.setLogRepo.save({
      session_log_id: 1, set_id: 2, exercise_id: 1,
      reps_done: 10, weight_done: 50, rpe: 3,
      completed_at: '2026-05-01T10:05:00.000Z',
    });
    expect(await service.getSessionRPELabel(1)).toBe('Facile');
  });

  it('retourne "Difficile" si moyenne RPE >= 7.5 (tous à 9)', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await ctx.setLogRepo.save({
      session_log_id: 1, set_id: 1, exercise_id: 1,
      reps_done: 10, weight_done: 50, rpe: 9,
      completed_at: '2026-05-01T10:00:00.000Z',
    });
    expect(await service.getSessionRPELabel(1)).toBe('Difficile');
  });

  it('retourne "Normal" si moyenne RPE entre 4.5 et 7.5 (mix 3 + 9 = moyenne 6)', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await ctx.setLogRepo.save({
      session_log_id: 1, set_id: 1, exercise_id: 1,
      reps_done: 10, weight_done: 50, rpe: 3,
      completed_at: '2026-05-01T10:00:00.000Z',
    });
    await ctx.setLogRepo.save({
      session_log_id: 1, set_id: 2, exercise_id: 1,
      reps_done: 10, weight_done: 50, rpe: 9,
      completed_at: '2026-05-01T10:05:00.000Z',
    });
    expect(await service.getSessionRPELabel(1)).toBe('Normal');
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="SessionService.test" --no-coverage 2>&1 | tail -10
```
Attendu : FAIL — `service.getSessionRPELabel is not a function`

- [ ] **Step 3 : Implémenter `getSessionRPELabel` dans `SessionService.ts`**

Ajouter la méthode suivante dans la classe `SessionService`, juste avant la dernière `}` de fermeture de la classe (ligne ~309) :

```typescript
  async getSessionRPELabel(sessionLogId: number): Promise<'Facile' | 'Normal' | 'Difficile' | null> {
    const sets = await this.setLogRepo.findBySessionLogId(sessionLogId);
    const rpeValues = sets.map(s => s.rpe).filter((r): r is number => r !== null);
    if (rpeValues.length === 0) return null;
    const avg = rpeValues.reduce((sum, r) => sum + r, 0) / rpeValues.length;
    if (avg < 4.5) return 'Facile';
    if (avg < 7.5) return 'Normal';
    return 'Difficile';
  }
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="SessionService.test" --no-coverage 2>&1 | tail -10
```
Attendu : PASS — 5 nouveaux tests + tous les tests existants

- [ ] **Step 5 : Suite complète + TypeScript**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage 2>&1 | tail -5
```
Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/services/SessionService.ts app/services/SessionService.test.ts && git commit -m "feat(session): SessionService.getSessionRPELabel — moyenne RPE par séance (TDD)"
```

---

### Task 2 : Wire + UI

**Files:**
- Modify: `app/app/session/[workoutId].tsx`
- Modify: `app/components/session/SummaryPhase.tsx`

**Contexte :**
- `makeServiceForCheck()` est une fonction déjà définie en haut de `[workoutId].tsx` (ligne ~42) qui retourne un `new SessionService(...)` avec tous les repos SQLite. Réutiliser cette fonction — ne pas créer un nouveau service inline.
- Le pattern `detectPlateaus` (lignes 219-229) est le modèle exact à suivre : `useEffect` avec guard `session.phase !== 'summary' || !session.sessionLogId`, `.then(setXxx).catch(console.error)`.
- `useState<'Facile' | 'Normal' | 'Difficile' | null>(null)` — l'état s'initialise à `null` (valeur par défaut si RPE non renseigné).
- `SummaryPhase` est rendu aux lignes 380-396 avec les props existantes. `rpeLabel` s'ajoute comme prop optionnelle.
- Dans `SummaryPhase.tsx`, la ligne `heroDuration` est à la ligne 47 — c'est la seule ligne à modifier pour l'affichage.

- [ ] **Step 1 : Mettre à jour `app/app/session/[workoutId].tsx`**

**1a. Ajouter l'état `rpeLabel` après les autres `useState` de la summary (vers la ligne 216-217) :**

Trouver :
```typescript
  const [plateaus, setPlateaus] = useState<PlateauResult[]>([]);
  const [selectedMood, setSelectedMood] = useState<1 | 2 | 3 | undefined>(undefined);
```

Remplacer par :
```typescript
  const [plateaus, setPlateaus] = useState<PlateauResult[]>([]);
  const [rpeLabel, setRpeLabel] = useState<'Facile' | 'Normal' | 'Difficile' | null>(null);
  const [selectedMood, setSelectedMood] = useState<1 | 2 | 3 | undefined>(undefined);
```

**1b. Ajouter le `useEffect` RPE après le useEffect `detectPlateaus` (lignes 219-229) :**

Trouver :
```typescript
  useEffect(() => {
    if (session.phase !== 'summary' || !session.sessionLogId) return;
    const db = getDb();
    const service = new PlateauDetectionService(
      new SQLiteSetLogRepository(db),
      new SQLiteSessionLogRepository(db),
      new SQLiteWorkoutExerciseRepository(db),
      new SQLiteExerciseRepository(db),
    );
    service.detectPlateaus(session.sessionLogId).then(setPlateaus).catch(console.error);
  }, [session.phase, session.sessionLogId]);
```

Insérer **après** ce bloc :
```typescript
  useEffect(() => {
    if (session.phase !== 'summary' || !session.sessionLogId) return;
    makeServiceForCheck().getSessionRPELabel(session.sessionLogId).then(setRpeLabel).catch(console.error);
  }, [session.phase, session.sessionLogId]);
```

**1c. Passer `rpeLabel` à `<SummaryPhase />` (ligne ~381-396) :**

Trouver :
```tsx
        {!session.error && session.phase === 'summary' && (
          <SummaryPhase
            progressions={session.progressions}
            totalSets={session.totalSetsLogged}
            durationSeconds={summaryDurationSeconds}
            totalVolumeKg={session.totalVolume}
            plateaus={plateaus}
            suggestNextDeload={deloadSuggested && !isDeloadSession}
            onMoodSelect={handleMoodSelect}
            selectedMood={selectedMood}
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
            notes={sessionNotes}
            onNotesChange={setSessionNotes}
            onClose={handleBack}
          />
        )}
```

Remplacer par :
```tsx
        {!session.error && session.phase === 'summary' && (
          <SummaryPhase
            progressions={session.progressions}
            totalSets={session.totalSetsLogged}
            durationSeconds={summaryDurationSeconds}
            totalVolumeKg={session.totalVolume}
            plateaus={plateaus}
            rpeLabel={rpeLabel}
            suggestNextDeload={deloadSuggested && !isDeloadSession}
            onMoodSelect={handleMoodSelect}
            selectedMood={selectedMood}
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
            notes={sessionNotes}
            onNotesChange={setSessionNotes}
            onClose={handleBack}
          />
        )}
```

- [ ] **Step 2 : Mettre à jour `app/components/session/SummaryPhase.tsx`**

**2a. Ajouter `rpeLabel` à l'interface `SummaryPhaseProps` (ligne ~13-27) :**

Trouver :
```typescript
interface SummaryPhaseProps {
  progressions: ProgressionResult[];
  totalSets: number;
  durationSeconds: number;
  totalVolumeKg?: number;
  plateaus?: PlateauResult[];
  suggestNextDeload?: boolean;
  onMoodSelect?: (mood: 1 | 2 | 3) => void;
  selectedMood?: 1 | 2 | 3;
  selectedTags?: SessionTagSlug[];
  onTagToggle?: (slug: SessionTagSlug) => void;
  notes?: string;
  onNotesChange?: (text: string) => void;
  onClose: () => void | Promise<void>;
}
```

Remplacer par :
```typescript
interface SummaryPhaseProps {
  progressions: ProgressionResult[];
  totalSets: number;
  durationSeconds: number;
  totalVolumeKg?: number;
  plateaus?: PlateauResult[];
  rpeLabel?: 'Facile' | 'Normal' | 'Difficile' | null;
  suggestNextDeload?: boolean;
  onMoodSelect?: (mood: 1 | 2 | 3) => void;
  selectedMood?: 1 | 2 | 3;
  selectedTags?: SessionTagSlug[];
  onTagToggle?: (slug: SessionTagSlug) => void;
  notes?: string;
  onNotesChange?: (text: string) => void;
  onClose: () => void | Promise<void>;
}
```

**2b. Ajouter `rpeLabel` à la destructuration de la fonction (ligne ~35) :**

Trouver :
```typescript
export function SummaryPhase({ progressions, totalSets, durationSeconds, totalVolumeKg, plateaus, suggestNextDeload, onMoodSelect, selectedMood, selectedTags = [], onTagToggle, notes = '', onNotesChange, onClose }: SummaryPhaseProps) {
```

Remplacer par :
```typescript
export function SummaryPhase({ progressions, totalSets, durationSeconds, totalVolumeKg, plateaus, rpeLabel, suggestNextDeload, onMoodSelect, selectedMood, selectedTags = [], onTagToggle, notes = '', onNotesChange, onClose }: SummaryPhaseProps) {
```

**2c. Modifier la ligne `heroDuration` pour inclure le label RPE (ligne ~47) :**

Trouver :
```tsx
        <Text style={[styles.heroDuration, { color: colors.textSecondary }]}>{formatDuration(durationSeconds)}</Text>
```

Remplacer par :
```tsx
        <Text style={[styles.heroDuration, { color: colors.textSecondary }]}>
          {formatDuration(durationSeconds)}{rpeLabel ? ` · Effort : ${rpeLabel}` : ''}
        </Text>
```

- [ ] **Step 3 : TypeScript + ESLint + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage 2>&1 | tail -5
cd /c/Users/sylva/projects/training-app/app && npx eslint . --ext .ts,.tsx --max-warnings 0 2>&1 | tail -5
```
Attendu : 0 erreurs TS, tous les tests passent, 0 warnings ESLint.

- [ ] **Step 4 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add "app/app/session/[workoutId].tsx" app/components/session/SummaryPhase.tsx && git commit -m "feat(session): RPE moyen affiché dans SummaryPhase hero"
```

---

## Self-Review

**Spec coverage :**
- ✅ `getSessionRPELabel` filtre `rpe !== null` — T1
- ✅ Retourne `null` si aucun set ou tous null — T1
- ✅ Mapping < 4.5 / 4.5–7.5 / ≥ 7.5 — T1
- ✅ 5 tests TDD couvrant tous les cas — T1
- ✅ Appelé au passage en phase `summary` — T2
- ✅ Affiché inline : `"47 min · Effort : Normal"` — T2
- ✅ Caché si `null` (durée seule) — T2

**Placeholders :** aucun.

**Type consistency :** `getSessionRPELabel(): Promise<'Facile' | 'Normal' | 'Difficile' | null>` → `useState<'Facile' | 'Normal' | 'Difficile' | null>(null)` → `rpeLabel?: 'Facile' | 'Normal' | 'Difficile' | null` dans l'interface. Cohérent partout.
