# Spec — Comparaison séance vs précédente

**Date :** 2026-06-13
**Statut :** Approuvé

---

## Contexte

En fin de séance (SummaryPhase), l'utilisateur voit son volume total. Ajouter le delta vs la dernière séance complétée sur le même workout donne un repère factuel sans jugement.

Philosophie anti-perf (filtre 3 questions) :
- Célèbre la présence (✓) : delta factuel, neutre si négatif — pas de punition
- Données tirées (✓) : l'utilisateur est en SummaryPhase, il a demandé ce contexte
- Soi-même (✓) : compare uniquement à sa propre séance précédente

---

## Règles de gestion

- **Périmètre** : dernière séance `completed` sur le même `workout_id`, hors séance courante.
- **Métriques comparées** : volume total (kg) + nombre de séries loggées.
- **Pas de séance précédente** : section delta masquée silencieusement (première séance sur ce workout, ou aucune complétée avant).
- **Delta négatif** : affiché en `colors.textSecondary` (gris neutre). Jamais en rouge. Jamais de libellé évaluatif.
- **Delta zéro** : affiché quand même (`+0 kg · +0 séries vs séance préc.` → non, masqué si les deux deltas sont 0).
- **Bodyweight** : si `totalVolumeKg` est null/0, la volume card n'existe pas — la ligne delta n'existe pas non plus.

---

## UI

Dans la volume card existante, sous le volume total :

```
VOLUME
12 450 kg          +1 250 kg · +3 séries vs séance préc.
```

Si delta négatif :
```
VOLUME
11 200 kg          −800 kg · −2 séries vs séance préc.
```

- Delta positif → `colors.primary`
- Delta négatif → `colors.textSecondary`
- Ligne delta masquée si `previousSession` absent (null)
- Ligne delta masquée si `deltaVolume === 0 && deltaSets === 0`

---

## Architecture

### `SessionService.getPreviousSessionSummary`

```typescript
async getPreviousSessionSummary(
  workoutId: number,
  currentSessionLogId: number,
): Promise<{ volume: number; sets: number } | null>
```

- Appelle `sessionLogRepo.findByWorkoutId(workoutId)` (méthode existante, retourne DESC)
- Filtre `status === 'completed'` ET `id !== currentSessionLogId`
- Prend le premier résultat (le plus récent)
- Si aucun → retourne `null`
- Appelle `setLogRepo.findBySessionLogId(prevSession.id)`
- Retourne `{ volume: Σ(reps_done × weight_done), sets: setLogs.length }`

Aucune nouvelle méthode repo requise.

### `useSession`

Nouvel état `prevSummary: { volume: number; sets: number } | null` (défaut `null`).

useEffect déclenché quand `session.phase === 'summary'` (pattern identique à `rpeLabel` et `detectPlateaus`) :

```typescript
useEffect(() => {
  if (session.phase !== 'summary') return;
  if (!session.currentSessionLogId || !session.workoutId) return;
  sessionService
    .getPreviousSessionSummary(session.workoutId, session.currentSessionLogId)
    .then(prev => { if (mountedRef.current) setPrevSummary(prev); })
    .catch(() => {});
}, [session.phase, session.currentSessionLogId, session.workoutId]);
```

`prevSummary` passé à `<SummaryPhase previousSession={prevSummary} />`.

### `SummaryPhase`

Nouvelle prop `previousSession?: { volume: number; sets: number } | null`.

Deltas calculés dans le composant :

```typescript
const deltaVolume = previousSession && totalVolumeKg != null
  ? totalVolumeKg - previousSession.volume
  : null;
const deltaSets = previousSession != null
  ? totalSets - previousSession.sets
  : null;
const showDelta = deltaVolume !== null && deltaSets !== null
  && !(deltaVolume === 0 && deltaSets === 0);
```

Affichage dans la volume card, sous `volumeValue` :

```tsx
{showDelta && (
  <Text style={[styles.volumeDelta, { color: deltaVolume >= 0 ? colors.primary : colors.textSecondary }]}>
    {deltaVolume >= 0 ? '+' : ''}{Math.round(parseFloat(convert(deltaVolume)))} {unitLabel}
    {' · '}
    {deltaSets >= 0 ? '+' : ''}{deltaSets} série{Math.abs(deltaSets) > 1 ? 's' : ''} vs séance préc.
  </Text>
)}
```

Style : `volumeDelta: { fontSize: 13, marginTop: 2 }`

---

## Tests TDD — `SessionService.getPreviousSessionSummary` (3 cas)

1. **Aucune séance complétée** → retourne `null`
2. **Séance précédente complétée** → retourne `{ volume, sets }` corrects
3. **Ignore `abandoned` / `active` / séance courante** → prend uniquement la dernière `completed` hors `currentId`

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `app/services/SessionService.ts` | Modifier — ajouter `getPreviousSessionSummary` |
| `app/services/SessionService.test.ts` | Modifier — 3 tests TDD |
| `app/hooks/useSession.ts` | Modifier — state `prevSummary` + useEffect |
| `app/components/session/SummaryPhase.tsx` | Modifier — prop + delta UI |

---

## Hors scope

- Comparaison par exercice (ex: "Squat : +5 kg vs préc.")
- Tendance sur N séances (graphe, moyenne glissante)
- Notifications post-séance
- Comparaison durée (trop variable)
