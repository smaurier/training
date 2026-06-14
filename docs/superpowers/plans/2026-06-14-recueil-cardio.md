# Recueil post-séance cardio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher une card optionnelle en `SummaryPhase` pour saisir durée/distance/sensation quand des sets cardio n'ont pas été renseignés.

**Architecture:** `updateCardioData` ajouté à `ISetLogRepository` (SQLite UPDATE + InMemory mutation). `SessionService.saveCardioData` délègue à ce repo. `SummaryPhase` reçoit les nouvelles props et gère son propre état local (formulaire + dismiss). `[workoutId].tsx` détecte les sets cardio vides au passage en phase `summary` et câble le handler.

**Tech Stack:** TypeScript strict, expo-sqlite, Jest TDD, React Native

**Dépendance:** Aucune (indépendant des autres plans du pack).

---

## Fichiers impactés

- Modify: `app/repositories/ISetLogRepository.ts`
- Modify: `app/repositories/SQLiteSetLogRepository.ts`
- Modify: `app/repositories/InMemorySetLogRepository.ts`
- Modify: `app/repositories/setLogRepository.contract.ts`
- Modify: `app/services/SessionService.ts`
- Modify: `app/services/SessionService.test.ts`
- Modify: `app/components/session/SummaryPhase.tsx`
- Modify: `app/app/session/[workoutId].tsx`

---

## Task 1 — `updateCardioData` sur les repos SetLog (TDD)

**Files:**
- Modify: `app/repositories/ISetLogRepository.ts`
- Modify: `app/repositories/SQLiteSetLogRepository.ts`
- Modify: `app/repositories/InMemorySetLogRepository.ts`
- Modify: `app/repositories/setLogRepository.contract.ts`

### Context

`ISetLogRepository` a : `save`, `findBySessionLogId`, `findBySetId`, `countBySessionLogIds`, `findByExerciseId`, `findFromDate`, `findDistinctExerciseIds`, `deleteBySetAndSession`. Pas de méthode update. `InMemorySetLogRepository` stocke ses items dans `this.items`. `SQLiteSetLogRepository` utilise `this.db.runAsync`.

`CreateSetLogDto = Omit<SetLog, 'id' | 'duration_seconds' | 'distance_meters'> & { duration_seconds?: number | null; distance_meters?: number | null }` — les deux champs sont déjà dans `SetLog`, juste à mettre à jour.

- [ ] **Step 1 : Ajouter les tests contract RED**

Dans `app/repositories/setLogRepository.contract.ts`, ajouter un nouveau `describe` avant la dernière accolade de `runSetLogRepositoryContractTests` :

```typescript
  describe('updateCardioData', () => {
    it('met à jour duration_seconds, distance_meters et rpe', async () => {
      const saved = await repo.save(dto1);
      await repo.updateCardioData(saved.id, 1800, 5000, 6);
      const logs = await repo.findBySessionLogId(dto1.session_log_id);
      const updated = logs.find(l => l.id === saved.id)!;
      expect(updated.duration_seconds).toBe(1800);
      expect(updated.distance_meters).toBe(5000);
      expect(updated.rpe).toBe(6);
    });

    it('accepte null pour tous les champs', async () => {
      const saved = await repo.save({ ...dto1, rpe: 8 });
      await repo.updateCardioData(saved.id, null, null, null);
      const logs = await repo.findBySessionLogId(dto1.session_log_id);
      const updated = logs.find(l => l.id === saved.id)!;
      expect(updated.duration_seconds).toBeNull();
      expect(updated.distance_meters).toBeNull();
      expect(updated.rpe).toBeNull();
    });

    it('ne modifie pas les autres set_logs', async () => {
      const s1 = await repo.save(dto1);
      const s2 = await repo.save({ ...dto1, set_id: 11, completed_at: '2026-01-01T10:06:00.000Z' });
      await repo.updateCardioData(s1.id, 600, 2000, 3);
      const logs = await repo.findBySessionLogId(dto1.session_log_id);
      const other = logs.find(l => l.id === s2.id)!;
      expect(other.duration_seconds).toBeNull();
    });
  });
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="InMemorySetLog" --no-coverage 2>&1 | tail -10
```

Attendu : FAIL — `repo.updateCardioData is not a function`

- [ ] **Step 3 : Ajouter à l'interface**

Dans `app/repositories/ISetLogRepository.ts`, ajouter après `deleteBySetAndSession` :

```typescript
  updateCardioData(
    id: number,
    duration_seconds: number | null,
    distance_meters: number | null,
    rpe: number | null,
  ): Promise<void>;
```

- [ ] **Step 4 : Implémenter dans `InMemorySetLogRepository`**

Dans `app/repositories/InMemorySetLogRepository.ts`, ajouter après `deleteBySetAndSession` :

```typescript
  async updateCardioData(
    id: number,
    duration_seconds: number | null,
    distance_meters: number | null,
    rpe: number | null,
  ): Promise<void> {
    const item = this.items.find(s => s.id === id);
    if (item) {
      item.duration_seconds = duration_seconds;
      item.distance_meters = distance_meters;
      item.rpe = rpe;
    }
  }
```

- [ ] **Step 5 : Implémenter dans `SQLiteSetLogRepository`**

Dans `app/repositories/SQLiteSetLogRepository.ts`, ajouter après `deleteBySetAndSession` :

```typescript
  async updateCardioData(
    id: number,
    duration_seconds: number | null,
    distance_meters: number | null,
    rpe: number | null,
  ): Promise<void> {
    await this.db.runAsync(
      'UPDATE set_logs SET duration_seconds = ?, distance_meters = ?, rpe = ? WHERE id = ?',
      [duration_seconds, distance_meters, rpe, id],
    );
  }
```

- [ ] **Step 6 : Vérifier GREEN**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="InMemorySetLog|SetLogRepository" --no-coverage 2>&1 | tail -10
```

Attendu : tous passent

- [ ] **Step 7 : Typecheck**

```bash
cd C:/Users/sylva/projects/training-app/app && npm run typecheck 2>&1 | tail -5
```

Attendu : 0 erreurs

- [ ] **Step 8 : Commit**

```bash
cd C:/Users/sylva/projects/training-app/app && git add repositories/ISetLogRepository.ts repositories/SQLiteSetLogRepository.ts repositories/InMemorySetLogRepository.ts repositories/setLogRepository.contract.ts && git commit -m "feat(repo): updateCardioData sur ISetLogRepository"
```

---

## Task 2 — `SessionService.saveCardioData` (TDD)

**Files:**
- Modify: `app/services/SessionService.ts`
- Modify: `app/services/SessionService.test.ts`

### Context

`SessionService` est injecté avec `setLogRepo: ISetLogRepository` (2e paramètre du constructeur, d'après les tests existants). Il a déjà `saveMoodAfter(id, mood)` et `saveSessionMeta(id, tags, notes)` comme méthodes post-séance similaires. Ajouter `saveCardioData` sur le même modèle.

`makeService()` dans les tests : crée `InMemorySetLogRepository` parmi les repos. Après Task 1, `InMemorySetLogRepository` a `updateCardioData`.

- [ ] **Step 1 : Ajouter le test RED**

Dans `app/services/SessionService.test.ts`, ajouter après le dernier `describe` existant :

```typescript
describe('SessionService.saveCardioData', () => {
  it('délègue à setLogRepo.updateCardioData avec les bonnes valeurs', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    const setLog = await ctx.setLogRepo.save({
      session_log_id: log.id, set_id: 1, exercise_id: 1,
      reps_done: 1, weight_done: 0, rpe: null,
      completed_at: new Date().toISOString(),
    });
    await service.saveCardioData(setLog.id, 1800, 5000, 6);
    const updated = (await ctx.setLogRepo.findBySessionLogId(log.id))[0];
    expect(updated.duration_seconds).toBe(1800);
    expect(updated.distance_meters).toBe(5000);
    expect(updated.rpe).toBe(6);
  });

  it('accepte null pour tous les champs', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    const setLog = await ctx.setLogRepo.save({
      session_log_id: log.id, set_id: 1, exercise_id: 1,
      reps_done: 1, weight_done: 0, rpe: null,
      completed_at: new Date().toISOString(),
    });
    await expect(service.saveCardioData(setLog.id, null, null, null)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="SessionService" --no-coverage 2>&1 | tail -10
```

Attendu : FAIL — `service.saveCardioData is not a function`

- [ ] **Step 3 : Ajouter `saveCardioData` dans `SessionService.ts`**

Dans `app/services/SessionService.ts`, ajouter après `saveMoodAfter` (ou `saveSessionMeta`) :

```typescript
  async saveCardioData(
    setLogId: number,
    duration_seconds: number | null,
    distance_meters: number | null,
    rpe: number | null,
  ): Promise<void> {
    await this.setLogRepo.updateCardioData(setLogId, duration_seconds, distance_meters, rpe);
  }
```

- [ ] **Step 4 : Vérifier GREEN**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="SessionService" --no-coverage 2>&1 | tail -10
```

Attendu : tous passent

- [ ] **Step 5 : Suite complète + typecheck**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test --no-coverage 2>&1 | tail -5 && npm run typecheck 2>&1 | tail -5
```

Attendu : tous passent, 0 erreurs TS

- [ ] **Step 6 : Commit**

```bash
cd C:/Users/sylva/projects/training-app/app && git add services/SessionService.ts services/SessionService.test.ts && git commit -m "feat(service): SessionService.saveCardioData"
```

---

## Task 3 — Card recueil cardio dans `SummaryPhase`

**Files:**
- Modify: `app/components/session/SummaryPhase.tsx`

### Context

`SummaryPhase` est un composant fonctionnel qui reçoit des props bien définies. Il utilise `useUnits()` pour les conversions de distance (`convert(meters)` retourne une string, `unitLabel` = 'kg' ou 'lbs'). Il n'y a pas de `useState` actuellement dans le composant — en ajouter pour le formulaire.

La card recueil cardio n'est affichée que si `emptyCardioSetLogCount > 0` et que l'utilisateur ne l'a pas dismissée. Elle est placée après le block `suggestNextDeload` et avant la section humeur.

Design :
- Titre : "Tu as fait du cardio ?"
- Champs : durée (minutes + secondes, deux `TextInput` numériques côte à côte), distance (km, `TextInput` numérique)
- Chips sensation : Léger / Normal / Difficile (facultatif)
- Boutons : "Enregistrer" (primaire) + "Ignorer" (secondaire)

- [ ] **Step 1 : Ajouter les imports `useState` et le type dans `SummaryPhase.tsx`**

En haut du fichier, modifier l'import React :

```typescript
import { useState } from 'react';
```

(Si `React` n'est pas importé, ajouter `import React, { useState } from 'react';` — sinon, ajouter juste `useState` à l'import existant)

- [ ] **Step 2 : Ajouter les nouvelles props à l'interface**

Dans `interface SummaryPhaseProps`, ajouter après `onClose` :

```typescript
  emptyCardioSetLogCount?: number;
  onSaveCardioData?: (
    durationSeconds: number | null,
    distanceMeters: number | null,
    rpe: number | null,
  ) => Promise<void>;
```

- [ ] **Step 3 : Ajouter l'état local et la logique dans le composant**

Après la déclaration `const { convert, label: unitLabel } = useUnits();`, ajouter :

```typescript
  const [cardioDismissed, setCardioDismissed] = useState(false);
  const [cardioMinutes, setCardioMinutes] = useState('');
  const [cardioSeconds, setCardioSeconds] = useState('');
  const [cardioDistanceKm, setCardioDistanceKm] = useState('');
  const [cardioRpe, setCardioRpe] = useState<3 | 6 | 9 | null>(null);

  const showCardioCard = (emptyCardioSetLogCount ?? 0) > 0 && !cardioDismissed;

  const handleCardioSubmit = async () => {
    const mins = parseInt(cardioMinutes || '0', 10);
    const secs = parseInt(cardioSeconds || '0', 10);
    const totalSeconds = mins * 60 + secs;
    const km = parseFloat(cardioDistanceKm || '0');
    await onSaveCardioData?.(
      totalSeconds > 0 ? totalSeconds : null,
      km > 0 ? Math.round(km * 1000) : null,
      cardioRpe,
    );
    setCardioDismissed(true);
  };
```

- [ ] **Step 4 : Ajouter la card dans le JSX**

Après le bloc `{suggestNextDeload && (...)}` et avant `<View style={[styles.moodSection...`, ajouter :

```typescript
      {showCardioCard && (
        <View style={[styles.cardioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tu as fait du cardio ?</Text>
          <View style={styles.cardioRow}>
            <View style={styles.cardioField}>
              <Text style={[styles.cardioFieldLabel, { color: colors.textSecondary }]}>Min</Text>
              <TextInput
                style={[styles.cardioInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={cardioMinutes}
                onChangeText={setCardioMinutes}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Durée en minutes"
              />
            </View>
            <View style={styles.cardioField}>
              <Text style={[styles.cardioFieldLabel, { color: colors.textSecondary }]}>Sec</Text>
              <TextInput
                style={[styles.cardioInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={cardioSeconds}
                onChangeText={setCardioSeconds}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Durée en secondes"
              />
            </View>
            <View style={styles.cardioField}>
              <Text style={[styles.cardioFieldLabel, { color: colors.textSecondary }]}>km</Text>
              <TextInput
                style={[styles.cardioInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={cardioDistanceKm}
                onChangeText={setCardioDistanceKm}
                keyboardType="decimal-pad"
                maxLength={6}
                placeholder="0.0"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Distance en kilomètres"
              />
            </View>
          </View>
          <View style={styles.cardioRpeRow}>
            {([
              { rpe: 3 as const, label: 'Léger' },
              { rpe: 6 as const, label: 'Normal' },
              { rpe: 9 as const, label: 'Difficile' },
            ] as const).map(({ rpe, label }) => (
              <PressableA11y
                key={rpe}
                accessibilityLabel={`Sensation : ${label}`}
                accessibilityState={{ selected: cardioRpe === rpe }}
                onPress={() => setCardioRpe(cardioRpe === rpe ? null : rpe)}
                style={[
                  styles.cardioRpeChip,
                  { borderColor: colors.border },
                  cardioRpe === rpe ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
                ]}
              >
                <Text style={[styles.cardioRpeLabel, { color: cardioRpe === rpe ? '#fff' : colors.text }]}>{label}</Text>
              </PressableA11y>
            ))}
          </View>
          <View style={styles.cardioBtnRow}>
            <PressableA11y
              accessibilityLabel="Enregistrer les données cardio"
              onPress={handleCardioSubmit}
              style={[styles.cardioSaveBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.cardioSaveBtnText}>Enregistrer</Text>
            </PressableA11y>
            <PressableA11y
              accessibilityLabel="Ignorer le recueil cardio"
              onPress={() => setCardioDismissed(true)}
              style={[styles.cardioIgnoreBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cardioIgnoreBtnText, { color: colors.textSecondary }]}>Ignorer</Text>
            </PressableA11y>
          </View>
        </View>
      )}
```

- [ ] **Step 5 : Ajouter les styles manquants**

Dans `const styles = StyleSheet.create({...})`, ajouter à la fin (avant la dernière accolade `}`) :

```typescript
  cardioCard: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 12 },
  cardioRow: { flexDirection: 'row', gap: 8 },
  cardioField: { flex: 1, gap: 4 },
  cardioFieldLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  cardioInput: { borderWidth: 1, borderRadius: Radius.sm, padding: 10, fontSize: 16, textAlign: 'center' },
  cardioRpeRow: { flexDirection: 'row', gap: 8 },
  cardioRpeChip: { flex: 1, borderWidth: 1, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  cardioRpeLabel: { fontSize: 13, fontWeight: '500' },
  cardioBtnRow: { flexDirection: 'row', gap: 8 },
  cardioSaveBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.sm, alignItems: 'center' },
  cardioSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cardioIgnoreBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.sm, alignItems: 'center', borderWidth: 1 },
  cardioIgnoreBtnText: { fontSize: 15 },
```

- [ ] **Step 6 : Typecheck**

```bash
cd C:/Users/sylva/projects/training-app/app && npm run typecheck 2>&1 | tail -5
```

Attendu : 0 erreurs

- [ ] **Step 7 : Commit**

```bash
cd C:/Users/sylva/projects/training-app/app && git add components/session/SummaryPhase.tsx && git commit -m "feat(session): card recueil cardio dans SummaryPhase"
```

---

## Task 4 — Détection + câblage dans `[workoutId].tsx`

**Files:**
- Modify: `app/app/session/[workoutId].tsx`

### Context

`[workoutId].tsx` gère la session via `useSession` (hook de state machine). La phase `summary` est déclenchée après `completeSession`. `session.sessionLogId` contient l'ID du session_log actif. `workoutDetails` vient de `useWorkoutExercises(workoutId)` et contient `exercises: WorkoutExerciseDetail[]` avec `exercise.type` dans chaque item.

`makeServiceForCheck()` est une factory locale qui crée un `SessionService` avec les repos SQLite. Elle est déjà utilisée pour `saveMoodAfter`, `saveSessionMeta`, etc.

Besoin : au passage en phase `summary`, lire les set_logs de la session et filtrer les cardio vides. Utiliser `SQLiteSetLogRepository` directement (pas via SessionService) pour cette lecture.

Pattern d'import repos déjà présent dans le fichier : `import { getDb } from '@/db/database';`

- [ ] **Step 1 : Lire le fichier pour connaître les imports existants**

Lire `app/app/session/[workoutId].tsx` (les 30 premières lignes) pour voir les imports en place.

- [ ] **Step 2 : Ajouter l'import `SQLiteSetLogRepository` si absent**

Si `SQLiteSetLogRepository` n'est pas importé, ajouter :

```typescript
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';
```

- [ ] **Step 3 : Ajouter le state `emptyCardioSetLogIds`**

Dans le composant, après les autres `useState`, ajouter :

```typescript
  const [emptyCardioSetLogIds, setEmptyCardioSetLogIds] = useState<number[]>([]);
```

- [ ] **Step 4 : Ajouter le `useEffect` de détection**

Après les `useEffect` existants, ajouter :

```typescript
  useEffect(() => {
    if (session.phase !== 'summary' || !session.sessionLogId) return;
    const cardioExerciseIds = new Set(
      workoutDetails?.exercises
        .filter(we => we.exercise.type === 'cardio')
        .map(we => we.exercise.id) ?? []
    );
    if (cardioExerciseIds.size === 0) return;
    const setLogRepo = new SQLiteSetLogRepository(getDb());
    setLogRepo.findBySessionLogId(session.sessionLogId).then(logs => {
      const empty = logs.filter(
        l => cardioExerciseIds.has(l.exercise_id) &&
             l.duration_seconds == null &&
             l.distance_meters == null
      );
      setEmptyCardioSetLogIds(empty.map(l => l.id));
    });
  }, [session.phase, session.sessionLogId, workoutDetails]);
```

- [ ] **Step 5 : Ajouter le handler `handleSaveCardioData`**

Dans le composant, après les autres handlers (ex: `handleMoodSelect`), ajouter :

```typescript
  const handleSaveCardioData = useCallback(async (
    durationSeconds: number | null,
    distanceMeters: number | null,
    rpe: number | null,
  ) => {
    if (emptyCardioSetLogIds.length === 0) return;
    await makeServiceForCheck().saveCardioData(
      emptyCardioSetLogIds[0],
      durationSeconds,
      distanceMeters,
      rpe,
    );
    setEmptyCardioSetLogIds([]);
  }, [emptyCardioSetLogIds]);
```

- [ ] **Step 6 : Passer les nouvelles props à `SummaryPhase`**

Trouver le rendu de `<SummaryPhase` et ajouter :

```typescript
  emptyCardioSetLogCount={emptyCardioSetLogIds.length}
  onSaveCardioData={handleSaveCardioData}
```

- [ ] **Step 7 : Typecheck complet**

```bash
cd C:/Users/sylva/projects/training-app/app && npm run typecheck 2>&1 | tail -5
```

Attendu : 0 erreurs

- [ ] **Step 8 : Suite de tests**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test --no-coverage 2>&1 | tail -5
```

Attendu : tous passent

- [ ] **Step 9 : Commit**

```bash
cd C:/Users/sylva/projects/training-app/app && git add app/session/[workoutId].tsx && git commit -m "feat(session): détection sets cardio vides + câblage recueil post-séance"
```
