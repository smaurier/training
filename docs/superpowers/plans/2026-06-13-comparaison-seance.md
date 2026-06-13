# Comparaison séance vs précédente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher dans SummaryPhase le delta de volume et de séries vs la dernière séance complétée sur le même workout.

**Architecture:** Nouvelle méthode `SessionService.getPreviousSessionSummary(workoutId, currentSessionLogId)` — filtre `status === 'completed'` sur les sessions du même workout, calcule volume + sets. Câblée dans `[workoutId].tsx` via un `useEffect` au passage en phase `summary` (pattern identique à `rpeLabel`). Affichée inline dans la volume card de `SummaryPhase`.

**Tech Stack:** React Native, Expo SDK 54, TypeScript strict, expo-sqlite, Jest

---

## Fichiers

| Fichier | Action |
|---|---|
| `app/services/SessionService.ts` | Modifier — ajouter `getPreviousSessionSummary` |
| `app/services/SessionService.test.ts` | Modifier — 3 tests TDD |
| `app/app/session/[workoutId].tsx` | Modifier — state + useEffect + prop |
| `app/components/session/SummaryPhase.tsx` | Modifier — prop + delta UI + style |

---

### Task 1 : `SessionService.getPreviousSessionSummary` (TDD)

**Files:**
- Modify: `app/services/SessionService.ts`
- Modify: `app/services/SessionService.test.ts`

**Contexte :**
- `makeService()` dans le fichier de test retourne un objet avec `sessionLogRepo`, `setLogRepo`, et `build()`. Utiliser le même pattern pour les nouveaux tests.
- `CreateSessionLogDto` = `{ workout_id, started_at, checkin_energy, checkin_fatigue, checkin_sleep, notes }` (les champs `id`, `ended_at`, `status`, `paused_position`, `mood_after`, `tags` sont omis).
- `ISessionLogRepository.complete(id, endedAt)` marque un session_log `status = 'completed'`.
- `ISetLogRepository.save(dto)` requiert : `session_log_id`, `set_id`, `exercise_id`, `reps_done`, `weight_done`, `rpe` (number | null), `completed_at` (ISO string).
- `InMemorySessionLogRepository.findByWorkoutId` retourne toutes les sessions (pas de filtre status). Trier par `started_at` DESC dans le service pour garantir "la plus récente".

- [ ] **Step 1 : Écrire les 3 tests RED**

Ajouter à la fin de `app/services/SessionService.test.ts` :

```typescript
describe('SessionService.getPreviousSessionSummary', () => {
  it('retourne null si aucune séance précédente complétée', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const current = await ctx.sessionLogRepo.save({
      workout_id: 1, started_at: '2026-06-08T10:00:00.000Z',
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    expect(await service.getPreviousSessionSummary(1, current.id)).toBeNull();
  });

  it('retourne volume + sets de la séance précédente complétée', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const prev = await ctx.sessionLogRepo.save({
      workout_id: 1, started_at: '2026-06-01T10:00:00.000Z',
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await ctx.sessionLogRepo.complete(prev.id, '2026-06-01T11:00:00.000Z');
    await ctx.setLogRepo.save({ session_log_id: prev.id, set_id: 1, exercise_id: 1, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:30:00.000Z' });
    await ctx.setLogRepo.save({ session_log_id: prev.id, set_id: 2, exercise_id: 1, reps_done: 8, weight_done: 60, rpe: null, completed_at: '2026-06-01T10:35:00.000Z' });
    const current = await ctx.sessionLogRepo.save({
      workout_id: 1, started_at: '2026-06-08T10:00:00.000Z',
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    const result = await service.getPreviousSessionSummary(1, current.id);
    expect(result).not.toBeNull();
    expect(result!.sets).toBe(2);
    expect(result!.volume).toBe(5 * 80 + 8 * 60); // 880
  });

  it('ignore les séances abandoned et la séance courante', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const abandoned = await ctx.sessionLogRepo.save({
      workout_id: 1, started_at: '2026-05-25T10:00:00.000Z',
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await ctx.sessionLogRepo.abandon(abandoned.id, '2026-05-25T10:30:00.000Z');
    await ctx.setLogRepo.save({ session_log_id: abandoned.id, set_id: 1, exercise_id: 1, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-05-25T10:15:00.000Z' });
    const completed = await ctx.sessionLogRepo.save({
      workout_id: 1, started_at: '2026-06-01T10:00:00.000Z',
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await ctx.sessionLogRepo.complete(completed.id, '2026-06-01T11:00:00.000Z');
    await ctx.setLogRepo.save({ session_log_id: completed.id, set_id: 2, exercise_id: 1, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:30:00.000Z' });
    const current = await ctx.sessionLogRepo.save({
      workout_id: 1, started_at: '2026-06-08T10:00:00.000Z',
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    const result = await service.getPreviousSessionSummary(1, current.id);
    expect(result!.volume).toBe(5 * 80); // 400 — pas 500 (abandoned ignoré)
    expect(result!.sets).toBe(1);
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="SessionService.test" --no-coverage 2>&1 | tail -10
```

Attendu : FAIL — `service.getPreviousSessionSummary is not a function`

- [ ] **Step 3 : Implémenter dans `app/services/SessionService.ts`**

Ajouter la méthode à la fin de la classe `SessionService` (avant la dernière `}`):

```typescript
  async getPreviousSessionSummary(
    workoutId: number,
    currentSessionLogId: number,
  ): Promise<{ volume: number; sets: number } | null> {
    const all = await this.sessionLogRepo.findByWorkoutId(workoutId);
    const prev = all
      .filter(s => s.status === 'completed' && s.id !== currentSessionLogId)
      .sort((a, b) => b.started_at.localeCompare(a.started_at))[0] ?? null;
    if (!prev) return null;
    const setLogs = await this.setLogRepo.findBySessionLogId(prev.id);
    const volume = setLogs.reduce((sum, sl) => sum + sl.reps_done * sl.weight_done, 0);
    return { volume, sets: setLogs.length };
  }
```

- [ ] **Step 4 : Vérifier GREEN**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="SessionService.test" --no-coverage 2>&1 | tail -10
```

Attendu : PASS — tous les tests du fichier passent.

- [ ] **Step 5 : Suite complète + TS**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/services/SessionService.ts app/services/SessionService.test.ts && git commit -m "feat(summary): getPreviousSessionSummary — delta volume + séries (TDD)"
```

---

### Task 2 : Wiring dans `[workoutId].tsx` + prop SummaryPhase

**Files:**
- Modify: `app/app/session/[workoutId].tsx`
- Modify: `app/components/session/SummaryPhase.tsx`

**Contexte :**
- `makeServiceForCheck()` (lignes 42-54 du fichier) crée un `SessionService` complet — réutiliser pour appeler `getPreviousSessionSummary`.
- `workoutId` est disponible directement dans `SessionContent` (paramètre de la fonction).
- `session.sessionLogId` est le champ de state (pas `session.currentSessionLogId`).
- Le pattern useEffect summary utilisé pour `rpeLabel` (lignes 232-235) :
  ```typescript
  useEffect(() => {
    if (session.phase !== 'summary' || !session.sessionLogId) return;
    makeServiceForCheck().getSessionRPELabel(session.sessionLogId).then(setRpeLabel).catch(console.error);
  }, [session.phase, session.sessionLogId]);
  ```
- `SummaryPhase` est rendu lignes 386-403. Prop `previousSession` à ajouter après `rpeLabel`.
- `session.totalSetsLogged` est le nombre de séries de la séance courante (transmis comme `totalSets` à SummaryPhase).
- `convert(x)` retourne une string → `parseFloat(convert(x))` pour calcul numérique.
- Style `volumeDelta` à ajouter dans `StyleSheet.create`.
- Pas de tests : comportement observable uniquement en UI.

- [ ] **Step 1 : Ajouter state dans `[workoutId].tsx`**

Après la ligne `const [rpeLabel, setRpeLabel] = useState<...>(null);` (ligne ~217), ajouter :

```typescript
  const [prevSummary, setPrevSummary] = useState<{ volume: number; sets: number } | null>(null);
```

- [ ] **Step 2 : Ajouter useEffect dans `[workoutId].tsx`**

Après le useEffect `rpeLabel` (lignes 232-235), ajouter :

```typescript
  useEffect(() => {
    if (session.phase !== 'summary' || !session.sessionLogId) return;
    makeServiceForCheck()
      .getPreviousSessionSummary(workoutId, session.sessionLogId)
      .then(setPrevSummary)
      .catch(console.error);
  }, [session.phase, session.sessionLogId, workoutId]);
```

- [ ] **Step 3 : Passer la prop à `<SummaryPhase>`**

Trouver le rendu de `<SummaryPhase>` (ligne ~387). Ajouter après `rpeLabel={rpeLabel}` :

```tsx
            previousSession={prevSummary}
```

- [ ] **Step 4 : Ajouter la prop dans `SummaryPhase.tsx`**

Dans l'interface `SummaryPhaseProps` (lignes 13-28), ajouter après `rpeLabel` :

```typescript
  previousSession?: { volume: number; sets: number } | null;
```

Dans la destructuration de la fonction (ligne 36), ajouter `previousSession` :

```typescript
export function SummaryPhase({ progressions, totalSets, durationSeconds, totalVolumeKg, plateaus, rpeLabel, previousSession, suggestNextDeload, onMoodSelect, selectedMood, selectedTags = [], onTagToggle, notes = '', onNotesChange, onClose }: SummaryPhaseProps) {
```

- [ ] **Step 5 : Calculer les deltas dans `SummaryPhase.tsx`**

Après la ligne `const progressionCount = progressions.filter(p => p.achieved).length;` (ligne 41), ajouter :

```typescript
  const deltaVolume = previousSession != null && totalVolumeKg != null
    ? totalVolumeKg - previousSession.volume
    : null;
  const deltaSets = previousSession != null
    ? totalSets - previousSession.sets
    : null;
  const showDelta = deltaVolume !== null && deltaSets !== null
    && !(deltaVolume === 0 && deltaSets === 0);
```

- [ ] **Step 6 : Ajouter l'affichage dans la volume card**

Dans `SummaryPhase.tsx`, trouver la volume card (lignes 64-71) :

```tsx
      {totalVolumeKg != null && totalVolumeKg > 0 && (
        <View style={[styles.volumeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>VOLUME TOTAL</Text>
          <Text style={[styles.volumeValue, { color: colors.text }]}>
            {Math.round(parseFloat(convert(totalVolumeKg))).toLocaleString()} {unitLabel}
          </Text>
        </View>
      )}
```

Remplacer par :

```tsx
      {totalVolumeKg != null && totalVolumeKg > 0 && (
        <View style={[styles.volumeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>VOLUME TOTAL</Text>
          <Text style={[styles.volumeValue, { color: colors.text }]}>
            {Math.round(parseFloat(convert(totalVolumeKg))).toLocaleString()} {unitLabel}
          </Text>
          {showDelta && (
            <Text style={[styles.volumeDelta, { color: deltaVolume! >= 0 ? colors.primary : colors.textSecondary }]}>
              {deltaVolume! >= 0 ? '+' : ''}{Math.round(parseFloat(convert(deltaVolume!))).toLocaleString()} {unitLabel}
              {' · '}
              {deltaSets! >= 0 ? '+' : ''}{deltaSets} série{Math.abs(deltaSets!) > 1 ? 's' : ''} vs séance préc.
            </Text>
          )}
        </View>
      )}
```

- [ ] **Step 7 : Ajouter le style dans `SummaryPhase.tsx`**

Dans `StyleSheet.create({...})`, après `volumeValue`, ajouter :

```typescript
  volumeDelta: { fontSize: 13, marginTop: 4 },
```

- [ ] **Step 8 : TypeScript + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -20 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 9 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add "app/app/session/[workoutId].tsx" app/components/session/SummaryPhase.tsx && git commit -m "feat(summary): delta volume + séries vs séance précédente dans SummaryPhase"
```

---

## Self-Review

**Spec coverage :**
- ✅ `getPreviousSessionSummary` — filtre `completed`, exclut séance courante — T1
- ✅ 3 tests TDD : null, volume+sets corrects, ignore abandoned — T1
- ✅ Tri par `started_at` DESC → séance la plus récente — T1
- ✅ Prop `previousSession` dans SummaryPhase — T2
- ✅ Delta positif → `colors.primary`, négatif → `colors.textSecondary` — T2
- ✅ Masqué si `deltaVolume === 0 && deltaSets === 0` — T2
- ✅ Masqué si `previousSession` null (pas de séance préc.) — T2 (condition `showDelta`)
- ✅ Libellé `vs séance préc.` — T2
- ✅ Pluriel `série/séries` — T2

**Placeholders :** aucun.

**Type consistency :**
- `{ volume: number; sets: number } | null` défini T1 → prop T2 (`previousSession?: { volume: number; sets: number } | null`) → state T2 (`useState<{ volume: number; sets: number } | null>(null)`). ✓
- `deltaVolume`, `deltaSets` : `number | null` en state → `!` non-null assertion dans JSX après `showDelta` gate. ✓
- `convert(deltaVolume!)` : appel avec `number` → retourne `string` → `parseFloat` → `Math.round`. ✓
