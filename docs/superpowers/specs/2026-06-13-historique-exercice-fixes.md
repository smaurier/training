# Spec — Historique exercice : fixes "voir tout" + error state

**Date :** 2026-06-13
**Statut :** Approuvé

---

## Contexte

Deux problèmes silencieux sur l'écran historique exercice (`progression/[exerciseId].tsx`) et l'écran recherche (`progression/search.tsx`) :

1. `ExerciseHistoryService.getHistory()` limite à 10 séances par défaut. Un utilisateur avec 30 séances de Squat n'en voit que 9 (la 10e est dans "DERNIÈRE SÉANCE"). Aucun signal que des données sont cachées.

2. `useLoggedExercises` avale silencieusement toute erreur DB. `search.tsx` affiche "Aucun exercice loggé" en cas d'erreur — message faux et trompeur.

---

## Fix 1 — Historique complet (supprimer le cap)

### Règle

L'écran détail exercice est une page de consultation intentionnelle. Toutes les séances doivent être visibles sans interaction supplémentaire.

### Architecture

**`ExerciseHistoryService.getHistory(exerciseId, limit?)`**

- Changer signature : `limit = 10` → `limit?: number`
- Changer corps : `sessions.slice(0, limit)` → `limit !== undefined ? sessions.slice(0, limit) : sessions`
- Quand `limit` omis : retourne toutes les sessions
- Quand `limit` fourni : comportement actuel conservé (test `limit=2` reste valide)

**`useExerciseHistory`** — inchangé. Appelle `getHistory(exerciseId)` sans limite, obtient tout.

**`[exerciseId].tsx`** — inchangé. `recentSessions.slice(1)` retire déjà `lastSession` (affiché dans "DERNIÈRE SÉANCE"), le reste s'affiche sans cap.

### Tests

Test existant `'respecte la limite — limit=2 retourne max 2 sessions'` reste valide et passe sans modification.

Nouveau test RED→GREEN à ajouter dans `ExerciseHistoryService.test.ts` :

```typescript
it('retourne toutes les sessions quand limit omis', async () => {
  const { service, setLogRepo, exerciseRepo } = makeService();
  const ex = await exerciseRepo.save(baseExerciseDto);
  for (let i = 1; i <= 15; i++) {
    await setLogRepo.save({
      session_log_id: i, set_id: i, exercise_id: ex.id,
      reps_done: 5, weight_done: 80, rpe: null,
      completed_at: `2026-06-${String(i).padStart(2, '0')}T10:00:00.000Z`,
    });
  }
  const result = await service.getHistory(ex.id);
  expect(result.recentSessions).toHaveLength(15);
});
```

Rationale : protège contre une régression silencieuse (quelqu'un remet `limit = 10` par défaut sans comprendre l'intention).

---

## Fix 2 — Error state `useLoggedExercises`

### Règle

Un échec DB doit être distingué d'une liste vide légitime. L'utilisateur doit voir "Impossible de charger les exercices" et non "Aucun exercice loggé".

### Architecture

**`useLoggedExercises.ts`**

- Ajouter `const [error, setError] = useState<string | null>(null)`
- Dans `refresh()` : `setError(null)` au début, catch → `setError(err instanceof Error ? err.message : 'Erreur inconnue')`
- Exposer `error` dans le return

**`search.tsx`**

- Destructurer `error` depuis `useLoggedExercises()`
- Condition d'affichage révisée :
  - `error` → "Impossible de charger les exercices" (priorité sur les autres états vides)
  - `exercises.length === 0` → "Aucun exercice loggé" (inchangé)
  - `filtered.length === 0` → "Aucun résultat" (inchangé)

### Tests

Pas de nouveaux tests : le hook error state est un pattern standard déjà couvert dans `useExerciseHistory` (même pattern). Comportement visible directement en UI.

---

## Hors scope

- Pagination infinie / lazy loading (inutile pour un usage perso, <1000 séances max)
- "Voir plus" bouton (inutile — afficher tout est plus honnête)
- Retry automatique sur erreur DB
- Tests de régression hook (l'erreur est observable via l'UI)

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `app/services/ExerciseHistoryService.ts` | Modifier — `limit?: number`, slice conditionnel |
| `app/hooks/useLoggedExercises.ts` | Modifier — ajouter `error` state |
| `app/app/progression/search.tsx` | Modifier — afficher error state |

`useExerciseHistory.ts` et `[exerciseId].tsx` : **non touchés**.
