# Audit fonctionnel — Correctifs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger 2 bugs fonctionnels identifiés lors de l'audit réel : DÉMARRER actif avec 0 exercices, ResumeSessionCard affichée avec workout supprimé.

**Architecture:** Correctifs chirurgicaux — 1 composant UI, 1 service. Aucune nouvelle dépendance.

**Tech Stack:** React Native, Expo, TypeScript, Jest

---

## Tokens design system

```ts
colors.primary      // lime #84CC16
colors.onPrimary    // #0D0D0D — texte ON fond lime
colors.textSecondary // #888888 dark
colors.border       // #2A2A2A dark
colors.surface      // #1A1A1A dark
```

---

## Task 1: Désactiver DÉMARRER quand workout a 0 exercices

**Bug :** `app/(tabs)/index.tsx` — le bouton DÉMARRER est toujours actif même si `previewExercises.length === 0`. Si le workout a 0 exercices, l'utilisateur arrive dans la session, presse "Démarrer", et reçoit une erreur confuse dans `useSession.startSession()`.

**Files:**
- Modify: `app/app/(tabs)/index.tsx`

Pas de test nécessaire — composant visuel pur, comportement déjà testé dans useSession.

- [ ] **Step 1: Lire le fichier pour localiser le bouton DÉMARRER**

Le bouton est autour de la ligne 217 :
```tsx
<PressableA11y
  accessibilityLabel={`Démarrer ${selectedWorkout.name}`}
  onPress={() => router.push({ pathname: '/session/[workoutId]' as any, params: { workoutId: String(selectedWorkout.id) } })}
  style={[styles.startBtn, { backgroundColor: colors.primary }]}
>
```

- [ ] **Step 2: Calculer `hasExercises`**

Juste avant le `return (`, ajouter :
```tsx
const hasExercises = previewExercises.length > 0;
```

- [ ] **Step 3: Modifier le bouton DÉMARRER**

Remplacer le bloc DÉMARRER :
```tsx
<PressableA11y
  accessibilityLabel={hasExercises ? `Démarrer ${selectedWorkout.name}` : 'Aucun exercice dans cette séance'}
  accessibilityState={{ disabled: !hasExercises }}
  onPress={hasExercises
    ? () => router.push({ pathname: '/session/[workoutId]' as any, params: { workoutId: String(selectedWorkout.id) } })
    : undefined}
  style={[styles.startBtn, { backgroundColor: colors.primary, opacity: hasExercises ? 1 : 0.4 }]}
>
  <Ionicons name="play" size={16} color={colors.onPrimary} importantForAccessibility="no" accessibilityElementsHidden={true} />
  <Text style={[styles.startBtnText, { color: colors.onPrimary }]}>DÉMARRER</Text>
</PressableA11y>
{!hasExercises && (
  <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
    Cette séance n'a pas encore d'exercices.
  </Text>
)}
```

- [ ] **Step 4: Ajouter le style `emptyHint`**

Dans `StyleSheet.create`, ajouter :
```tsx
emptyHint: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8 },
```

- [ ] **Step 5: Typecheck + commit**

```bash
cd app && npm run typecheck
git add app/app/(tabs)/index.tsx
git commit -m "fix(home): désactiver DÉMARRER si workout sans exercices"
```

---

## Task 2: Masquer ResumeSessionCard si workout supprimé

**Bug :** `services/SessionService.findAnyPausedSession()` retourne `{ workoutName: '' }` si le workout a été supprimé depuis la mise en pause. La ResumeSessionCard s'affiche avec un nom vide et navigue vers un workout inexistant.

**Fix :** Dans `findAnyPausedSession()`, si le workout n'existe plus → annuler la session en pause et retourner `null`.

**Files:**
- Modify: `app/services/SessionService.ts`
- Modify: `app/services/SessionService.test.ts`

- [ ] **Step 1: Lire `SessionService.ts` pour localiser `findAnyPausedSession`**

La méthode est autour de la ligne 159 :
```ts
async findAnyPausedSession(): Promise<PausedSessionInfo | null> {
  const sessionLog = await this.sessionLogRepo.findAnyPaused();
  if (!sessionLog) return null;
  const workout = await this.workoutRepo.findById(sessionLog.workout_id);
  // ...
  return { sessionLog, workoutName: workout?.name ?? '', setsLogged, volume };
}
```

- [ ] **Step 2: Écrire le test RED**

Dans `SessionService.test.ts`, trouver le describe de `findAnyPausedSession` (ou créer si absent). Ajouter :

```ts
it('retourne null si le workout de la session en pause a été supprimé', async () => {
  // Setup: session en pause avec un workout_id qui n'existe plus
  const pausedLog = await sessionLogRepo.save({
    workout_id: 9999, // workout inexistant
    status: 'paused',
    started_at: new Date().toISOString(),
    position_snapshot: null,
  });
  await sessionLogRepo.updateStatus(pausedLog.id, 'paused');

  const result = await service.findAnyPausedSession();
  expect(result).toBeNull();
});
```

Note : si `InMemorySessionLogRepository` n'a pas de méthode `updateStatus`, utiliser directement le `save` avec `status: 'paused'` dans le `CreateSessionLogDto` — regarder la signature avant d'écrire le test.

- [ ] **Step 3: Vérifier que le test échoue**

```bash
cd app && npx jest --testPathPattern="SessionService" --no-coverage 2>&1 | tail -20
```

Attendu : FAIL — le test actuel retournerait `{ workoutName: '' }` au lieu de `null`.

- [ ] **Step 4: Implémenter le fix**

Dans `findAnyPausedSession()`, après la récupération du workout, ajouter le guard :

```ts
async findAnyPausedSession(): Promise<PausedSessionInfo | null> {
  const sessionLog = await this.sessionLogRepo.findAnyPaused();
  if (!sessionLog) return null;

  const workout = await this.workoutRepo.findById(sessionLog.workout_id);
  if (!workout) {
    // Workout supprimé — abandonner la session fantôme
    await this.sessionLogRepo.updateStatus(sessionLog.id, 'abandoned');
    return null;
  }

  const setLogs = await this.setLogRepo.findBySessionLogId(sessionLog.id);
  const setsLogged = setLogs.length;
  const volume = setLogs.reduce((acc, s) => acc + (s.reps_done ?? 0) * (s.weight_done ?? 0), 0);
  return { sessionLog, workoutName: workout.name, setsLogged, volume };
}
```

Note : vérifier que `sessionLogRepo` a une méthode `updateStatus(id, status)` — si elle s'appelle différemment, adapter.

- [ ] **Step 5: Vérifier que le test passe**

```bash
cd app && npx jest --testPathPattern="SessionService" --no-coverage 2>&1 | tail -10
```

Attendu : tous les tests passent.

- [ ] **Step 6: Typecheck + commit**

```bash
cd app && npm run typecheck
git add app/services/SessionService.ts app/services/SessionService.test.ts
git commit -m "fix(session): masquer ResumeCard si workout supprimé, abandonner session fantôme"
```

---

## Self-review

**1. Couverture :** T1 = DÉMARRER disabled ✅, T2 = workout supprimé ✅. Les 2 autres faux positifs (RestPhase accessibilité déjà OK, Stats tab affiche 0 correctement) non traités — correct.

**2. Placeholders :** Aucun.

**3. Types :** `updateStatus` — vérifier signature avant d'écrire le test (step note présente).
