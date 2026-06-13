# Pack A — Séance : Annuler série + Humeur + Micro-copy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'annulation de série découvrable par swipe, collecter la humeur post-séance, et corriger les strings anti-perf dans toute l'app.

**Architecture:** Cinq tâches indépendantes. T1 = RunningPhase gesture. T2–T3 = DB + service (coup de chanin). T4 = SummaryPhase + câblage. T5 = batch copy. TypeScript cassé entre T2 et T3 — normal, compléter T3 avant de lancer `typecheck`.

**Tech Stack:** TypeScript strict, React Native, expo-sqlite, react-native-gesture-handler (déjà dans expo), Jest, @gorhom/bottom-sheet (déjà installé)

**Spec:** `docs/superpowers/specs/2026-06-13-pack-a-seance.md`

---

### Task 1: RunningPhase — undo conditionnel + swipe dots

**Files:**
- Modify: `app/components/session/RunningPhase.tsx`

**Contexte :**
- Le bouton undo existe déjà (lignes 263-271) — il est `disabled={!canUndo}` avec `opacity: 0.3`. L'objectif est de le rendre INVISIBLE quand `canUndo=false` (au lieu de disabled+grisé).
- La spec demande aussi un swipe pour affordance. On wrape la vue `seriesDots` (lignes 218-234) dans un `GestureDetector` avec `Gesture.Pan()` : swipe gauche → `onUndo()`.
- `react-native-gesture-handler` est déjà une dépendance (utilisé par `@gorhom/bottom-sheet`).

- [ ] **Step 1 : Ajouter l'import GestureDetector**

En haut de `RunningPhase.tsx`, après la ligne `import { PressableA11y... }`, ajouter :

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
```

- [ ] **Step 2 : Créer le gesture Pan dans le composant**

Dans le corps de `RunningPhase`, après `const repsFeedback = ...` (ligne ~199), ajouter :

```typescript
const undoSwipe = useMemo(
  () =>
    Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-30, 30])
      .failOffsetY([-15, 15])
      .onEnd((e) => {
        if (canUndo && e.translationX < -60) {
          onUndo();
        }
      }),
  [canUndo, onUndo],
);
```

- [ ] **Step 3 : Rendre le bouton undo conditionnel**

Remplacer les lignes 263-271 (le `<PressableA11y>` undo) par :

```typescript
{canUndo && (
  <PressableA11y
    onPress={onUndo}
    accessibilityLabel="Annuler la dernière série"
    style={styles.actionBtn}
  >
    <Ionicons name="arrow-undo-outline" size={22} color={colors.text} />
  </PressableA11y>
)}
```

- [ ] **Step 4 : Wrapper seriesDots dans GestureDetector**

Remplacer le `<View style={styles.seriesDots} ...>` (lignes 218-234) par :

```typescript
<GestureDetector gesture={undoSwipe}>
  <View
    style={styles.seriesDots}
    accessible
    accessibilityLabel={`Série ${currentSetIndex + 1} sur ${block.sets.length}`}
  >
    {block.sets.map((_, i) => (
      <View
        key={i}
        style={[
          styles.dot,
          i < currentSetIndex && { backgroundColor: '#16a34a' },
          i === currentSetIndex && { backgroundColor: colors.primary, width: 10, height: 10, borderRadius: 5 },
          i > currentSetIndex && { borderColor: colors.border, borderWidth: 1.5 },
        ]}
      />
    ))}
  </View>
</GestureDetector>
```

- [ ] **Step 5 : Supprimer le style `undoBtnDisabled` devenu inutile**

Dans `StyleSheet.create` en bas du fichier, supprimer la ligne :
```typescript
undoBtnDisabled: { opacity: 0.3 },
```

- [ ] **Step 6 : Lancer le typecheck**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 7 : Lancer les tests**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage
```

Attendu : tous passent.

- [ ] **Step 8 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/components/session/RunningPhase.tsx && git commit -m "feat(RunningPhase): undo conditionnel + swipe dots pour annuler"
```

---

### Task 2: DB + types + repo — migration v10 + mood_after

**Files:**
- Modify: `app/db/schema.ts`
- Modify: `app/db/types.ts`
- Modify: `app/repositories/ISessionLogRepository.ts`
- Modify: `app/repositories/SQLiteSessionLogRepository.ts`
- Modify: `app/repositories/InMemorySessionLogRepository.ts`

⚠️ TypeScript sera cassé après cette tâche jusqu'à la fin de T3. Ne pas lancer typecheck avant T3.

- [ ] **Step 1 : Ajouter migration v10 dans `schema.ts`**

Après le tableau `MIGRATIONS`, à la suite de la dernière migration `// v9 ...`, ajouter :

```typescript
  // v10 — humeur post-séance : ressenti après (1=Épuisé, 2=Bien, 3=En forme)
  `ALTER TABLE session_logs ADD COLUMN mood_after INTEGER CHECK(mood_after BETWEEN 1 AND 3);`,
```

- [ ] **Step 2 : Ajouter `mood_after` au type `SessionLog` dans `types.ts`**

Modifier l'interface `SessionLog` (actuellement lignes 62-73) :

```typescript
export interface SessionLog {
  id: number;
  workout_id: number;
  started_at: string;
  ended_at: string | null;
  checkin_energy: 1 | 2 | 3 | null;
  checkin_fatigue: 1 | 2 | 3 | null;
  checkin_sleep: 1 | 2 | 3 | null;
  notes: string | null;
  status: SessionStatus;
  paused_position: string | null;
  mood_after: 1 | 2 | 3 | null;
}
```

- [ ] **Step 3 : Ajouter `saveMoodAfter` à `ISessionLogRepository.ts`**

```typescript
export interface ISessionLogRepository {
  save(dto: CreateSessionLogDto): Promise<SessionLog>;
  findById(id: number): Promise<SessionLog | null>;
  findByWorkoutId(workoutId: number): Promise<SessionLog[]>;
  findLatestByWorkoutIds(workoutIds: number[]): Promise<SessionLog | null>;
  findLatestDatesPerWorkout(workoutIds: number[]): Promise<Map<number, string | null>>;
  complete(id: number, endedAt: string): Promise<void>;
  pause(id: number, position: string): Promise<void>;
  abandon(id: number, endedAt: string): Promise<void>;
  findAnyPaused(): Promise<SessionLog | null>;
  findAll(): Promise<SessionLog[]>;
  saveMoodAfter(id: number, mood: 1 | 2 | 3): Promise<void>;
}
```

- [ ] **Step 4 : Implémenter dans `SQLiteSessionLogRepository.ts`**

Ajouter la méthode après `findAll()` :

```typescript
async saveMoodAfter(id: number, mood: 1 | 2 | 3): Promise<void> {
  await this.db.runAsync(
    'UPDATE session_logs SET mood_after = ? WHERE id = ?',
    [mood, id],
  );
}
```

- [ ] **Step 5 : Implémenter dans `InMemorySessionLogRepository.ts`**

Ajouter la méthode après `findAll()` :

```typescript
async saveMoodAfter(id: number, mood: 1 | 2 | 3): Promise<void> {
  const item = this.items.find(i => i.id === id);
  if (item) { item.mood_after = mood; }
}
```

Aussi : dans la méthode `save`, initialiser `mood_after: null` dans l'objet créé :

```typescript
async save(dto: CreateSessionLogDto): Promise<SessionLog> {
  const item: SessionLog = {
    ...dto, id: this.nextId++, ended_at: null, status: 'active', paused_position: null, mood_after: null,
  };
  this.items.push(item);
  return item;
}
```

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/db/schema.ts app/db/types.ts app/repositories/ISessionLogRepository.ts app/repositories/SQLiteSessionLogRepository.ts app/repositories/InMemorySessionLogRepository.ts && git commit -m "feat(db): migration v10 mood_after + ISessionLogRepository.saveMoodAfter"
```

---

### Task 3: SessionService.saveMoodAfter TDD

**Files:**
- Modify: `app/services/SessionService.ts`
- Modify: `app/services/SessionService.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Dans `SessionService.test.ts`, ajouter un nouveau describe après les describes existants :

```typescript
describe('SessionService.saveMoodAfter', () => {
  it('persiste mood_after sur la session', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.saveMoodAfter(log.id, 2);
    const updated = await ctx.sessionLogRepo.findById(log.id);
    expect(updated?.mood_after).toBe(2);
  });

  it('écrase la valeur si appelé deux fois', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.saveMoodAfter(log.id, 1);
    await service.saveMoodAfter(log.id, 3);
    const updated = await ctx.sessionLogRepo.findById(log.id);
    expect(updated?.mood_after).toBe(3);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest SessionService --no-coverage
```

Attendu : 2 failures (`saveMoodAfter is not a function`).

- [ ] **Step 3 : Implémenter `saveMoodAfter` dans `SessionService.ts`**

Ajouter la méthode publique dans la classe `SessionService` (après `deleteSetLog` par exemple) :

```typescript
async saveMoodAfter(sessionLogId: number, mood: 1 | 2 | 3): Promise<void> {
  await this.sessionLogRepo.saveMoodAfter(sessionLogId, mood);
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest SessionService --no-coverage
```

Attendu : tous passent.

- [ ] **Step 5 : Typecheck global**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 6 : Lancer la suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage
```

Attendu : tous passent.

- [ ] **Step 7 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/services/SessionService.ts app/services/SessionService.test.ts && git commit -m "feat(SessionService): saveMoodAfter — TDD 2 tests"
```

---

### Task 4: SummaryPhase humeur + câblage [workoutId].tsx

**Files:**
- Modify: `app/components/session/SummaryPhase.tsx`
- Modify: `app/app/session/[workoutId].tsx`

**Contexte :**
- `SummaryPhase` reçoit deux nouvelles props optionnelles : `onMoodSelect?` et `selectedMood?`.
- La section humeur apparaît juste avant le bouton "Retour au programme".
- Dans `[workoutId].tsx`, `session.sessionLogId` est disponible (type `number | null` dans `useSession`).

- [ ] **Step 1 : Mettre à jour l'interface props de `SummaryPhase`**

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
  onClose: () => void;
}
```

- [ ] **Step 2 : Ajouter la destructuration dans le composant**

```typescript
export function SummaryPhase({ progressions, totalSets, durationSeconds, totalVolumeKg, plateaus, suggestNextDeload, onMoodSelect, selectedMood, onClose }: SummaryPhaseProps) {
```

- [ ] **Step 3 : Ajouter la section humeur dans le JSX**

Insérer ce bloc juste avant `<PressableA11y accessibilityLabel="Retour au programme"...>` :

```typescript
{onMoodSelect && (
  <View style={[styles.moodSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>Comment tu te sens ?</Text>
    <View style={styles.moodRow}>
      {([
        { mood: 1 as const, emoji: '😓', label: 'Épuisé' },
        { mood: 2 as const, emoji: '😌', label: 'Bien' },
        { mood: 3 as const, emoji: '⚡', label: 'En forme' },
      ]).map(({ mood, emoji, label }) => (
        <PressableA11y
          key={mood}
          accessibilityLabel={label}
          accessibilityRole="radio"
          accessibilityState={{ checked: selectedMood === mood }}
          onPress={() => onMoodSelect(mood)}
          style={[
            styles.moodChip,
            {
              borderColor: selectedMood === mood ? colors.primary : colors.border,
              backgroundColor: selectedMood === mood ? colors.primary : colors.surface,
            },
          ]}
        >
          <Text style={styles.moodEmoji}>{emoji}</Text>
          <Text style={[styles.moodLabel, { color: selectedMood === mood ? '#fff' : colors.text }]}>
            {label}
          </Text>
        </PressableA11y>
      ))}
    </View>
  </View>
)}
```

- [ ] **Step 4 : Ajouter les styles manquants dans `StyleSheet.create`**

```typescript
moodSection: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 12 },
moodRow: { flexDirection: 'row', gap: 8 },
moodChip: {
  flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12,
  borderRadius: Radius.sm, borderWidth: 1, gap: 4,
},
moodEmoji: { fontSize: 22 },
moodLabel: { fontSize: 12, fontWeight: '500' },
```

- [ ] **Step 5 : Câbler dans `[workoutId].tsx`**

Ajouter l'import en haut (après les autres imports de services) :

```typescript
import { SessionService } from '@/services/SessionService';
// (probablement déjà importé — vérifier)
```

Ajouter le state local `selectedMood` après les autres states locaux (ex: `summaryDurationSeconds`) :

```typescript
const [selectedMood, setSelectedMood] = useState<1 | 2 | 3 | undefined>(undefined);
```

Ajouter le handler `handleMoodSelect` après `handleStartingWeightConfirm` :

```typescript
const handleMoodSelect = useCallback(async (mood: 1 | 2 | 3) => {
  setSelectedMood(mood);
  if (!session.sessionLogId) return;
  const db = getDb();
  const service = new SessionService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLitePersonalRecordRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteBlockRepository(db),
    new SQLiteSetRepository(db),
    new SQLiteExerciseRepository(db),
  );
  await service.saveMoodAfter(session.sessionLogId, mood);
}, [session.sessionLogId]);
```

> **Note :** Dans `[workoutId].tsx`, `SessionService` est typiquement déjà instancié via un useRef ou useMemo. Vérifie le pattern existant dans le fichier (chercher `new SessionService`) et réutilise-le plutôt que de créer une nouvelle instance.

Modifier le rendu `SummaryPhase` :

```typescript
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
    onClose={handleBack}
  />
)}
```

- [ ] **Step 6 : Lancer le typecheck**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 7 : Lancer les tests**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage
```

Attendu : tous passent.

- [ ] **Step 8 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/components/session/SummaryPhase.tsx app/app/session/[workoutId].tsx && git commit -m "feat(session): humeur post-séance — 3 chips dans SummaryPhase"
```

---

### Task 5: Micro-copy — toutes les corrections

**Files:**
- Modify: `app/components/session/RestPhase.tsx`
- Modify: `app/app/session/[workoutId].tsx`
- Modify: `app/progression/[exerciseId].tsx`
- Modify: `app/(tabs)/progression.tsx`
- Modify: `app/(tabs)/index.tsx`

**Table de référence complète :**

| Fichier | Avant | Après |
|---|---|---|
| `RestPhase.tsx:29` | `"C'EST PARTI !"` | `"À toi ·"` |
| `RestPhase.tsx:39` | `"C'EST PARTI"` | `"À toi"` |
| `RestPhase.tsx:50` | `"C'est parti, continuer la séance"` | `"À toi — continuer la séance"` |
| `RestPhase.tsx:65` | `"C'est parti →"` | `"À toi →"` |
| `[workoutId].tsx:364` | `"Nouveau PR !"` | `"✦ Nouvelle meilleure marque"` |
| `[workoutId].tsx:232` | `"Nouveau record personnel !"` | `"Nouvelle meilleure marque !"` |
| `[exerciseId].tsx:115` | `"MEILLEUR PR"` | `"MEILLEURE MARQUE"` |
| `progression.tsx:137` | `'PRs'` | `'MARQUES'` |
| `index.tsx:27` | `'Jamais faite'` | `'Nouvelle'` |
| `index.tsx:76` | `'Aucune série complétée'` | `'Interrompue'` |

- [ ] **Step 1 : Corriger `RestPhase.tsx`**

Lire le fichier pour trouver les lignes exactes. Appliquer les 4 corrections :
- `{isDone ? "C'EST PARTI !" : 'REPOS'}` → `{isDone ? "À toi ·" : 'REPOS'}`
- `label={isDone ? "C'EST PARTI" : 'REPOS'}` → `label={isDone ? "À toi" : 'REPOS'}`
- `accessibilityLabel={isDone ? "C'est parti, continuer la séance" : 'Passer le repos'}` → `accessibilityLabel={isDone ? "À toi — continuer la séance" : 'Passer le repos'}`
- `{isDone ? "C'est parti →" : 'Passer →'}` → `{isDone ? "À toi →" : 'Passer →'}`

- [ ] **Step 2 : Corriger `[workoutId].tsx` (2 occurrences)**

- Ligne ~232 : `AccessibilityInfo.announceForAccessibility('Nouveau record personnel !')` → `AccessibilityInfo.announceForAccessibility('Nouvelle meilleure marque !')`
- Ligne ~364 : `<Text style={styles.prBadgeTitle}>Nouveau PR !</Text>` → `<Text style={styles.prBadgeTitle}>✦ Nouvelle meilleure marque</Text>`

- [ ] **Step 3 : Corriger `progression/[exerciseId].tsx`**

- Ligne ~115 : `"MEILLEUR PR"` → `"MEILLEURE MARQUE"`

- [ ] **Step 4 : Corriger `(tabs)/progression.tsx`**

- `{ label: 'PRs', value: stats.prCount }` → `{ label: 'MARQUES', value: stats.prCount }`

- [ ] **Step 5 : Corriger `(tabs)/index.tsx`**

- `return 'Jamais faite';` → `return 'Nouvelle';`
- `'Aucune série complétée'` → `'Interrompue'`

- [ ] **Step 6 : Lancer le typecheck**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 7 : Lancer les tests**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage
```

Attendu : tous passent.

- [ ] **Step 8 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/components/session/RestPhase.tsx app/app/session/[workoutId].tsx app/progression/[exerciseId].tsx "app/(tabs)/progression.tsx" "app/(tabs)/index.tsx" && git commit -m "fix(copy): micro-copy audit — À toi, meilleure marque, Nouvelle, Interrompue"
```
