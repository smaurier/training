# Détection plateau — Design

## Contexte

Avec la double progression câblée (S31), le poids augmente automatiquement après chaque séance réussie. Un plateau se produit quand le poids n'a pas bougé depuis N séances — typiquement parce que l'utilisateur rate ses reps à répétition (ou exercice bodyweight). Signaler ce plateau en fin de séance donne à l'utilisateur un signal clair et motivant avant la prochaine tentative.

---

## Décisions de design

| Sujet | Décision | Raison |
|---|---|---|
| Définition plateau | Même `weight_done` × 3 séances complétées consécutives | Indépendant succès/échec — couvre tous les cas (échec répété, bodyweight) |
| Seuil | 3 fixe | Seuil standard LP (Rippetoe, Barbell Medicine, NSCA). 2 = trop de faux positifs |
| Scope | `weight_type = 'fixed'` uniquement | Bodyweight/bar n'ont pas de progression de poids à suivre |
| Signal | `SummaryPhase` fin de séance | Contexte chaud, motivant ("je vais ajuster à la prochaine") |
| Persistance | Aucune (query pure sur `set_logs`) | YAGNI — pas besoin de colonne `consecutive_holds` pour ce use case |
| Solutions prescriptives | Hors scope | Feature #3 (décharge auto). Ici : informatif uniquement |
| Copy | Factuel, additif, tourné action | Philosophie UX CLAUDE.md — pas de punition, pas de "tu n'as pas progressé" |

---

## Règle de détection

```
Pour chaque exercice de la séance (weight_type = 'fixed') :
  Récupérer les 3 dernières séances COMPLÉTÉES incluant la séance courante
  Si set_logs.weight_done identique sur les 3 séances pour les sets travail
  → plateau détecté
```

Séances avec `status != 'completed'` (abandonnées, en pause) exclues du comptage.

La séance courante compte dans les 3 (détection immédiate à la fin de la 3e séance stagnante).

---

## Architecture

### Nouveau fichier : `app/services/PlateauDetectionService.ts`

```typescript
export interface PlateauResult {
  exerciseId: number;
  exerciseName: string;
  currentWeight: number;
  sessionsCount: number; // toujours 3 dans la V1, extensible
}

export class PlateauDetectionService {
  constructor(
    private setLogRepo: ISetLogRepository,
    private sessionLogRepo: ISessionLogRepository,
    private workoutExerciseRepo: IWorkoutExerciseRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async detectPlateaus(sessionLogId: number): Promise<PlateauResult[]>
}
```

**Algorithme `detectPlateaus` :**

1. Fetch `sessionLog` → `workout_id`
2. Fetch `workoutExercises` pour ce `workout_id`
3. Pour chaque `workoutExercise` (skip si bodyweight/bar) :
   a. `setLogRepo.findByExerciseId(exerciseId)` — tous les logs triés par `completed_at DESC`
   b. Grouper par `session_log_id`, filtrer les séances `status = 'completed'`
   c. Prendre les 3 plus récentes incluant `sessionLogId`
   d. Si < 3 séances → skip
   e. Si `weight_done` identique sur les 3 → `PlateauResult`
4. Retourner la liste

### Nouveau fichier : `app/services/PlateauDetectionService.test.ts`

Tests TDD avec `InMemorySetLogRepository`, `InMemorySessionLogRepository`, etc.

Cas à couvrir :
- 3 séances même poids → plateau détecté
- 2 séances même poids → pas de plateau (pas assez de données)
- 3 séances poids différent à la 2e → pas de plateau
- 3 séances même poids mais 2e séance abandonnée → pas de plateau (séance abandonnée exclue)
- Exercice bodyweight → ignoré
- 4 séances : [60, 60, 60, 55] (plus récentes en tête) → plateau sur les 3 dernières ✓

---

## Intégration dans `[workoutId].tsx`

```typescript
// Après calculateProgressions()
const plateaus = await plateauService.detectPlateaus(sessionLogId);
// Passer à SummaryPhase
```

`SummaryPhase` reçoit `plateaus?: PlateauResult[]` comme prop optionnelle.

---

## UI — SummaryPhase

Card visible uniquement si `plateaus.length > 0`. Positionnée sous la section progressions.

**Copy :**
```
Même charge depuis 3 séances
  Développé couché · 60 kg
  Curl barre EZ · 20 kg

Tu peux tenter d'augmenter à la prochaine séance.
```

Ton : neutre/factuel. Pas de rouge, pas de "tu n'as pas progressé", pas d'émoticône alarmante. Conforme au filtre UX CLAUDE.md (factuel ✓, personnel ✓, additif ✓).

Pas de bouton d'action — l'utilisateur ajuste via le bouton barbell déjà présent dans `RunningPhase`.

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `app/services/PlateauDetectionService.ts` | Créer |
| `app/services/PlateauDetectionService.test.ts` | Créer (TDD) |
| `app/app/(tabs)/session/[workoutId].tsx` | Appeler `detectPlateaus`, passer résultat à SummaryPhase |
| `app/components/session/SummaryPhase.tsx` | Prop `plateaus?`, card si non vide |

---

## Hors scope

- Solutions prescriptives (décharge, substitution) → feature #3
- `consecutive_holds` en DB → pas nécessaire ici
- Signal à CheckInPhase de la séance suivante → peut être ajouté si retour terrain
- Exercices bodyweight/bar — pas de signal (pas de poids cible)
- Plateau par RPE (même RPE élevé × N séances) → revue scientifique audit global
