# Cycle rotatif — Home screen design

## Goal

Remplacer la carte statique "PROCHAINE SÉANCE" par une carte interactive avec chips de sélection : l'app suggère la prochaine séance du programme, l'utilisateur peut en choisir une autre en un tap.

## Architecture

Trois couches modifiées :

1. **Repository** — nouvelle méthode `findLatestDatesPerWorkout` (une requête SQL GROUP BY)
2. **Hook** — `useHomeWorkout` encapsule toute la logique de la carte (chargement, suggestion, sélection, dates)
3. **UI** — `(tabs)/index.tsx` reécrit pour consommer le hook

`SessionService` n'est pas modifié : `getNextWorkout` reste intact, le hook l'appelle directement.

## Fichiers

| Action | Fichier |
|--------|---------|
| Modifier | `repositories/ISessionLogRepository.ts` |
| Modifier | `repositories/SQLiteSessionLogRepository.ts` |
| Modifier | `repositories/InMemorySessionLogRepository.ts` |
| Modifier | `repositories/sessionLogRepository.contract.ts` |
| Créer | `hooks/useHomeWorkout.ts` |
| Modifier | `app/(tabs)/index.tsx` |
| Créer | `hooks/useHomeWorkout.test.ts` |

## Couche Repository

### Nouvelle méthode `findLatestDatesPerWorkout`

```ts
// ISessionLogRepository.ts
findLatestDatesPerWorkout(workoutIds: number[]): Promise<Map<number, string | null>>;
```

Retourne une `Map<workoutId, started_at ISO string | null>`. `null` = jamais fait.

**SQLite :**

```sql
SELECT workout_id, MAX(started_at) AS last_started
FROM session_logs
WHERE workout_id IN (?, ?, ?)
GROUP BY workout_id
```

Si `workoutIds` est vide → retourner `new Map()` sans query.

**InMemory :**

```ts
async findLatestDatesPerWorkout(workoutIds: number[]): Promise<Map<number, string | null>> {
  const result = new Map<number, string | null>();
  for (const id of workoutIds) {
    const logs = this.logs
      .filter(l => l.workout_id === id)
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
    result.set(id, logs[0]?.started_at ?? null);
  }
  return result;
}
```

**Contract tests à ajouter :**

```ts
describe('findLatestDatesPerWorkout', () => {
  it('returns null for workouts with no sessions', async () => {
    const map = await repo.findLatestDatesPerWorkout([1, 2]);
    expect(map.get(1)).toBeNull();
    expect(map.get(2)).toBeNull();
  });

  it('returns latest started_at per workout', async () => {
    // seed: workout 1 → sessions at '2026-01-01', '2026-01-10'
    // expected: map.get(1) === '2026-01-10...'
  });

  it('returns empty map for empty input', async () => {
    const map = await repo.findLatestDatesPerWorkout([]);
    expect(map.size).toBe(0);
  });
});
```

## Hook `useHomeWorkout`

```ts
// hooks/useHomeWorkout.ts

export interface HomeWorkoutState {
  workouts: Workout[];
  suggestedWorkout: Workout | null;
  selectedWorkout: Workout | null;
  lastDates: Map<number, string | null>;
  isSuggestion: boolean;              // selectedWorkout === suggestedWorkout
  loading: boolean;
  hasActiveProgram: boolean;
  error: string | null;
  selectWorkout: (w: Workout) => void;
  refresh: () => Promise<void>;
}

export function useHomeWorkout(): HomeWorkoutState
```

### Logique interne

1. `useFocusEffect` → appel `refresh()`
2. `refresh()` :
   - Charge le programme actif via `SQLiteProgramRepository`
   - Si aucun programme actif → `hasActiveProgram = false`, stop
   - Charge tous les workouts via `SQLiteWorkoutRepository.findByProgramId` (triés par `order_index`)
   - Appelle `SessionService.getNextWorkout(programId)` → `suggestedWorkout`
   - Appelle `findLatestDatesPerWorkout(workoutIds)` → `lastDates`
   - Initialise `selectedWorkout = suggestedWorkout`
3. `selectWorkout(w)` → `setSelectedWorkout(w)` — local uniquement, pas de persistance

`selectedWorkout` se réinitialise à `suggestedWorkout` à chaque `refresh()` (focus screen = retour à la suggestion).

### Tests (useHomeWorkout.test.ts)

Tester avec repos in-memory injectés :
- Programme inactif → `hasActiveProgram = false`
- Programme actif, aucune séance → `suggestedWorkout = workouts[0]`, dates toutes `null`
- Programme actif, dernier = workout[1] → `suggestedWorkout = workout[2]` (rotation)
- `selectWorkout(w)` → `selectedWorkout` change, `isSuggestion` devient `false`
- `refresh()` → `selectedWorkout` revient à `suggestedWorkout`

## UI `(tabs)/index.tsx`

### Helper `formatRelativeDate`

```ts
function formatRelativeDate(isoDate: string | null): string {
  if (!isoDate) return 'Jamais faite';
  const diffDays = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return `il y a ${diffDays} jours`;
}
```

### Structure de la carte

```
PROCHAINE SÉANCE           (ou "SÉANCE CHOISIE" si isSuggestion === false)
{selectedWorkout.name}
{formatRelativeDate(lastDates.get(selectedWorkout.id))}

[chips ScrollView horizontal]

[▶ Démarrer {selectedWorkout.name}]
```

### Chips

```tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  <View
    accessibilityRole="radiogroup"
    accessibilityLabel="Séances du programme"
    style={styles.chipsRow}
  >
    {workouts.map(w => {
      const isSelected = w.id === selectedWorkout?.id;
      const isSug = w.id === suggestedWorkout?.id;
      return (
        <PressableA11y
          key={w.id}
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={`${w.name}${isSug && !isSelected ? ' — suggéré par le cycle' : ''}`}
          onPress={() => selectWorkout(w)}
          style={[
            styles.chip,
            isSelected && styles.chipSelected,
            !isSelected && isSug && styles.chipSuggested,
          ]}
        >
          <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
            {w.name}
          </Text>
        </PressableA11y>
      );
    })}
  </View>
</ScrollView>
```

### Styles chips

```ts
chip: {
  paddingHorizontal: 14,
  paddingVertical: 0,
  minHeight: 44,            // WCAG 2.5.5 tap target
  borderRadius: 22,
  borderWidth: 1,
  borderColor: colors.border,
  justifyContent: 'center',
  alignItems: 'center',
},
chipSelected: {
  backgroundColor: colors.primary,
  borderColor: colors.primary,
},
chipSuggested: {                       // suggérée mais non sélectionnée
  borderStyle: 'dashed',
  borderColor: colors.primary,
},
chipText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
chipTextSelected: { color: '#fff', fontWeight: '700' },
```

**Note :** `borderStyle: 'dashed'` non supporté sur Android pour les rectangles — fallback : `opacity: 0.6` sur chip non sélectionnée suggérée, ou bordure pointillée via SVG. À tester en device ; si problème Android, simplifier en opacité.

### Bouton Démarrer

```tsx
<PressableA11y
  accessibilityLabel={`Démarrer ${selectedWorkout.name}`}
  onPress={() => router.push({
    pathname: '/session/[workoutId]' as any,
    params: { workoutId: String(selectedWorkout.id) },
  })}
  style={[styles.startBtn, { backgroundColor: colors.primary }]}
>
  <Ionicons name="play" size={18} color="#fff" />
  <Text style={styles.startBtnText}>Démarrer</Text>
</PressableA11y>
```

## États de la carte

| Condition | Affichage |
|-----------|-----------|
| `loading` | `ActivityIndicator` |
| `!hasActiveProgram` | "Aucun programme actif" + lien programmes (inchangé) |
| `workouts.length === 0` | "Aucune séance configurée" + lien (inchangé) |
| Nominal | Carte chips |

## Décisions explicites

- **Pas de persistance** : sélection manuelle perdue au focus-out. Intentionnel — le cycle suggéré est la source de vérité.
- **`borderStyle: 'dashed'` Android** : à vérifier en device. Si non rendu, fallback opacity.
- **`getNextWorkout` inchangé** : réutilisé tel quel depuis le hook.
- **Date basée sur `started_at`** : cohérent avec `findLatestByWorkoutIds` existant.
- **N workouts** : ScrollView horizontal sans limite. Fonctionne pour 2 à N séances.
