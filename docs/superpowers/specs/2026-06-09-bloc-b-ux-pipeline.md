# Spec — Bloc B UX Pipeline : RestPhase + ExerciseTransitionPhase

**Date :** 2026-06-09
**Scope :** Pipeline séance explicite — phases repos et transition exercice
**Statut :** Approuvé

---

## 1. Contexte

Pipeline actuel : `checkin → running (sets + timer implicite) → summary`

Problèmes terrain :
- Utilisateur ne sait pas dans quel état il est (repos ? série ? transition ?)
- Changement d'exercice invisible — a failli continuer sur le mauvais exercice
- Timer démarre sans signal clair
- Pas de description exercice avant de commencer

---

## 2. Nouveau pipeline

```
checkin
  → exercise_transition   ← premier exercice
    → running             ← set 1
      → rest
    → running             ← set 2
      → rest
    ...
    → running             ← dernier set du bloc
  → exercise_transition   ← exercice suivant
    ...
  → summary
```

`SessionPhase` :
```ts
export type SessionPhase = 'checkin' | 'exercise_transition' | 'running' | 'rest' | 'summary';
```

---

## 3. Migration DB

**Migration v5** dans `db/migrations.ts` :
```sql
ALTER TABLE exercises ADD COLUMN description TEXT;
```

Ajoutée à la suite des migrations existantes avec version bump.

`db/types.ts` — ajouter `description: string | null` sur `Exercise`.

---

## 4. Seeds — descriptions exercices

Dans `db/seeds.ts`, la boucle `EXTRA_EXERCISES` passe en vrai upsert :

```ts
if (!row) {
  await db.runAsync(
    'INSERT INTO exercises (name, type, muscle_groups, technical_notes, description, is_custom) VALUES (?, ?, ?, ?, ?, 0)',
    [ex.name, ex.type, ex.muscle_groups, ex.technical_notes, ex.description ?? null]
  );
} else {
  await db.runAsync(
    'UPDATE exercises SET description = ? WHERE id = ?',
    [ex.description ?? null, row.id]
  );
}
```

Le type `ExerciseSpec` (ou équivalent) reçoit `description?: string`.

### Descriptions complètes PPL

| Exercice | Description |
|---|---|
| **Développé couché barre** | Barre dans l'axe des mamelons, omoplates rétractées et déprimées contre le banc. Descente contrôlée jusqu'au contact léger sur le thorax. Pousser en arc en gardant les coudes à 45-75° du tronc. |
| **Pin Press** | Press depuis les taquets à hauteur de poitrine, départ arrêté (pas d'élan). Force pure sur la phase concentrique. Coudes sous la barre, gainage maximal. |
| **Développé incliné haltères** | Banc incliné 30-45°. Haltères en pronation, descente jusqu'aux épaules, coudes légèrement en dessous de la ligne des épaules. Pousser en convergeant vers le haut. |
| **Élévations latérales haltères** | Légère flexion des coudes, monter les bras jusqu'à hauteur d'épaules en rotation interne (pouces vers le bas). Descente lente et contrôlée. Éviter le balancement du buste. |
| **Dips** | Buste légèrement penché vers l'avant pour cibler les pectoraux. Descente jusqu'à ce que les épaules soient sous les coudes. Pousser fort en haut sans verrouiller les coudes. |
| **Extension triceps poulie haute** | Coudes fixes le long des oreilles, seuls les avant-bras bougent. Extension complète en bas, montée contrôlée. Éviter de décoller les coudes. |
| **Crunch poulie haute** | Agenouillé face à la poulie, mains derrière la tête ou tenant la corde. Fléchir le buste en contractant les abdos, pas en tirant avec les bras. |
| **Tractions** | Prise en pronation, largeur épaules ou légèrement plus large. Initier le mouvement avec les dorsaux en déprimant les omoplates. Monter jusqu'au menton au-dessus de la barre, descente complète pour étirer les grands dorsaux. |
| **Rowing barre** | Buste à 45° ou horizontal, dos plat. Tirer la barre vers le nombril en serrant les omoplates à l'arrivée. Descente complète et contrôlée. Coudes proches du corps. |
| **Face pull** | Poulie haute, prise en pronation ou neutre. Tirer vers le visage en ouvrant les coudes à 90°. Finir avec les mains derrière les oreilles. Ideal pour la santé des épaules. |
| **Curl barre EZ** | Coudes fixes le long du corps. Montée jusqu'à contraction maximale du biceps, descente lente et complète. La barre EZ réduit la pression sur les poignets. |
| **Tirage poulie basse** | Assis face à la poulie, légère inclinaison du buste. Tirer vers le ventre en serrant les omoplates. Retour contrôlé en gardant le dos droit. |
| **Relevés de jambes suspendu** | Suspendu à la barre, jambes tendues ou genoux fléchis selon niveau. Monter les hanches en contractant les abdos, pas en se balançant. Descente lente. |
| **Squat barre** | Barre sur les trapèzes (low bar ou high bar), pieds à largeur épaules légèrement ouverts. Descente en poussant les genoux dans l'axe des orteils, buste droit. Profondeur minimum parallèle. Sortie explosive. |
| **Romanian Deadlift** | Barre proche du corps, jambes quasi-tendues (légère flexion). Descente en poussant les hanches vers l'arrière, sentir l'étirement des ischiojambiers. Remonter en contractant les fessiers. |
| **Fentes bulgares** | Pied arrière sur un banc, pied avant loin devant. Descendre en gardant le buste droit jusqu'à ce que le genou arrière frôle le sol. Pousser sur le talon avant pour remonter. |
| **Leg curl poulie** | Allongé face vers le bas, chevilles fixées à la poulie. Fléchir les genoux jusqu'à 90-130°, contracter les ischiojambiers en haut. Descente lente et complète. |
| **Mollets debout sur step** | Pied avant du step, talons dans le vide. Descente complète en bas pour étirer, montée sur la pointe des pieds en contractant les mollets. Pause d'une seconde en haut. |
| **Footing** | Cadence cible 170-180 pas/min pour réduire l'impact. Atterrissage sous le centre de gravité, pas en talon. Respiration rythmée 2-2 (2 pas inspire, 2 pas expire) ou 3-2 selon l'intensité. |
| **Cercles épaules** | Bras tendus, grands cercles lents vers l'avant puis vers l'arrière. Ampleur maximale à chaque rotation. Déverrouille l'articulation gléno-humérale. |
| **Rotations thoraciques** | En quadrupédie ou assis. Placer une main derrière la tête, ouvrir le coude vers le plafond en faisant pivoter le thorax. Garder les hanches stables. |
| **Band pull-aparts** | Bras tendus devant soi, élastique tenu en pronation. Ouvrir les bras jusqu'à toucher la poitrine avec l'élastique, serrer les omoplates. Retour lent. |
| **Suspension passive** | Suspendu à la barre, corps détendu, épaules qui montent vers les oreilles. Laisser le poids du corps décompresser la colonne et les épaules. Respirer profondément. |
| **Cat-cow** | En quadrupédie. Inspiration : creuser le dos, lever la tête et le coccyx (cow). Expiration : arrondir le dos, rentrer le menton et le bassin (cat). Mouvements fluides et synchronisés avec la respiration. |
| **Hip hinge léger** | Pieds à largeur d'épaules, léger fléchissement des genoux. Pousser les hanches vers l'arrière en gardant le dos plat, sentir l'activation des ischiojambiers. Retour debout en poussant les hanches vers l'avant. |
| **Deep squat hold** | Descendre en squat profond, talons au sol, bras tendus entre les genoux pour garder l'équilibre. Relâcher progressivement les hanches, hanches, et chevilles. |
| **Leg swings avant/arrière** | Debout sur un pied, balancer l'autre jambe d'avant en arrière avec amplitude croissante. Tenir un support si besoin. Déverrouille la hanche en flexion/extension. |
| **Leg swings latéraux** | Debout sur un pied, balancer l'autre jambe latéralement avec amplitude croissante. Déverrouille l'abduction/adduction de hanche. |
| **Cossack squat** | Pieds très écartés (2x largeur épaules). Fléchir sur un côté en gardant l'autre jambe tendue, pied à plat. Alterner les côtés en passant par le centre. |
| **Rotations poignets** | Bras tendus devant soi, faire des cercles avec les poignets dans les deux sens. Amplitude maximale. Prépare les articulations pour les mouvements de pressing. |
| **Étirement pectoraux au mur** | Bras à 90°, main et avant-bras contre le mur. Faire pivoter le corps vers l'opposé jusqu'à ressentir l'étirement au niveau du pectoral et de l'épaule. Maintenir sans forcer. |
| **Child pose** | Agenouillé, fesses vers les talons, bras tendus devant soi ou le long du corps. Relâcher complètement le dos et les épaules. Respiration abdominale profonde. |
| **Couch stretch** | Un genou au sol contre un mur, l'autre pied devant. Redresser le buste pour intensifier l'étirement du hip flexor et du quad. Tenir en respirant. |
| **Respiration diaphragmatique** | Allongé sur le dos, une main sur le ventre. Inspirer 4 secondes en gonflant le ventre, expirer 6 secondes en le rentrant. Active le système parasympathique, récupération active. |
| **World's Greatest Stretch** | Fente avant, main homolatérale au sol. Amener le coude vers le sol puis ouvrir le bras vers le plafond en rotation thoracique. Alterner les côtés. Mobilise hanche, thorax et épaule en un seul mouvement. |
| **Pancake stretch** | Assis au sol, jambes tendues très écartées. Se pencher vers l'avant en gardant le dos plat, tenter de poser la poitrine au sol. Progresser sans forcer. |
| **Étirement dorsaux** | Assis, saisir une barre ou l'encadrement d'une porte. Pousser les hanches vers l'arrière en arrondissant le dos pour étirer les grands dorsaux. |
| **Child pose latéral** | Depuis child pose, marcher les mains vers un côté pour cibler le grand dorsal et les obliques. Maintenir en respirant. |
| **Figure 4 stretch** | Allongé sur le dos, cheville sur le genou opposé. Tirer la jambe inférieure vers la poitrine pour étirer le piriforme et le fessier. |
| **Butterfly stretch** | Assis, plantes des pieds collées, genoux ouverts vers le sol. Se pencher légèrement en avant, pousser doucement les genoux vers le bas avec les coudes. |
| **Frog stretch** | En quadrupédie, écarter les genoux au maximum en gardant les pieds dans l'axe des genoux. S'asseoir progressivement vers l'arrière. Ouverture profonde des hanches. |
| **Étirement mollets** | Debout face à un mur, pied avant plié, pied arrière tendu talon au sol. Avancer le buste vers le mur pour intensifier. Maintenir en respirant. Effectuer les deux pieds. |
| **Pigeon pose** | Depuis une planche, amener le genou avant vers la main homolatérale, jambe arrière tendue. S'abaisser vers le sol pour étirer le piriforme et le fessier. Maintenir en respirant profondément. |
| **Étirement épaule cross-body** | Bras tendu passé devant le buste, l'autre bras le tire vers l'épaule opposée. Maintenir sans hausser l'épaule. Relâcher les trapèzes. |

---

## 5. WorkoutExerciseService

`WorkoutExerciseDetail.exercise` expose `description: string | null` — le champ est déjà dans `Exercise` après migration, le service le transmet tel quel.

---

## 6. useSession — nouvelles phases et actions

### Types

```ts
export type SessionPhase = 'checkin' | 'exercise_transition' | 'running' | 'rest' | 'summary';

export interface UseSessionResult {
  // ... existant ...
  confirmTransition: () => void;
  confirmRest: () => void;
  restDuration: number;         // rest_duration du set complété (capturé avant avance position)
  nextLabel: string;            // "Série 3/4 — 80kg" ou "Exercice suivant : Rowing barre"
}
```

### startSession

```ts
// Avant : setPhase('running')
// Après :
setPhase('exercise_transition');
```

### validateSet

```ts
const completedRestDuration = currentSet.rest_duration;  // capturer AVANT avance
const next = advancePosition(position, workoutDetails);

if (next === null) {
  await service.completeSession(sessionLogId);
  // calcul progressions...
  setPhase('summary');
  return;
}

const exerciseChanges = next.exerciseIdx !== position.exerciseIdx;
setRestDuration(completedRestDuration);
setPendingPhase(exerciseChanges ? 'exercise_transition' : 'running');
setNextLabel(computeNextLabel(next, workoutDetails, exerciseChanges));
setPosition(next);
setPhase('rest');
```

### confirmRest

```ts
setPhase(pendingPhase); // 'running' ou 'exercise_transition'
```

### confirmTransition

```ts
setPhase('running');
```

### skipSet

Comportement inchangé : avance la position directement sans passer par rest ni exercise_transition. Intentionnel — skip = urgence, bypass tout.

### State interne

```ts
const [restDuration, setRestDuration] = useState(90);
const [pendingPhase, setPendingPhase] = useState<'running' | 'exercise_transition'>('running');
```

### computeNextLabel (helper pur, testable)

```ts
function computeNextLabel(
  next: SessionPosition,
  exercises: WorkoutExerciseDetail[],
  exerciseChanges: boolean
): string {
  if (exerciseChanges) {
    return `Exercice suivant : ${exercises[next.exerciseIdx]?.exercise.name ?? ''}`;
  }
  const nextBlock = exercises[next.exerciseIdx]?.blocks[next.blockIdx];
  const totalSets = nextBlock?.sets.length ?? 1;
  const setNum = next.setIdx + 1;
  const weight = nextBlock?.sets[next.setIdx]?.weight;
  const weightLabel = weight != null ? ` — ${weight}kg` : '';
  return `Série ${setNum}/${totalSets}${weightLabel}`;
}
```

---

## 7. RestPhase

Fichier : `components/session/RestPhase.tsx`

```ts
interface RestPhaseProps {
  durationSeconds: number;
  timer: UseTimerResult;
  nextLabel: string;
  onContinue: () => void;
}
```

**Layout :**
- Label "REPOS" uppercase petit en haut
- Timer en grand (secondes restantes)
- Barre de progression linéaire : `width = (timer.remaining / durationSeconds) * 100%`
- `nextLabel` centré
- Bouton "Passer →" outlined (discret) toujours visible
- À zéro : vibration `[0, 500, 200, 500]`, fond passe à `colors.success`, bouton devient "C'est parti →" filled primary

**Comportement :**
- Le timer est démarré par le screen à l'entrée en phase `rest` (pas dans le composant)
- Jamais d'auto-avance — l'utilisateur tape toujours

---

## 8. ExerciseTransitionPhase

Fichier : `components/session/ExerciseTransitionPhase.tsx`

```ts
interface ExerciseTransitionPhaseProps {
  exercise: WorkoutExerciseDetail;
  exerciseNumber: number;   // 1-based
  totalExercises: number;
  onContinue: () => void;
}
```

**Layout :**
- Bande couleur 4px à gauche selon `exercise.exercise.type` (existant dans WorkoutExerciseCard)
- Label "EXERCICE N/TOTAL" uppercase petit
- Nom exercice en grand (28px bold)
- Résumé du bloc Travail : "4 séries × 8 reps — 90s repos" calculé depuis `blocks.find(b => b.is_work_block === 1 && b.name === 'Travail')`. Si pas de Travail → afficher durée du premier set (`duration_seconds`). Si footing → afficher "Cardio"
- Séparateur
- Description (si `exercise.exercise.description != null`) — sinon section absente
- Bouton "C'est parti →" filled primary

---

## 9. Session screen — [workoutId].tsx

### Timer wiring refactorisé

```ts
// Ancien : useEffect sur position
// Nouveau : useEffect sur phase
useEffect(() => {
  if (session.phase === 'rest') {
    timer.reset(session.restDuration);
    timer.start();
  }
}, [session.phase, session.restDuration]);
```

### Rendu

```tsx
{session.phase === 'checkin' && <CheckInPhase onStart={session.startSession} />}

{session.phase === 'exercise_transition' && session.currentExercise && (
  <ExerciseTransitionPhase
    exercise={session.currentExercise}
    exerciseNumber={session.position.exerciseIdx + 1}
    totalExercises={exercises.length}
    onContinue={session.confirmTransition}
  />
)}

{session.phase === 'running' && session.currentSet && session.currentBlock && session.currentExercise && (
  needsStartingWeight
    ? <ExerciseStartingWeightPhase exercise={session.currentExercise} onConfirm={handleStartingWeightConfirm} />
    : <RunningPhase key={session.currentSet.id} ... />
)}

{session.phase === 'rest' && (
  <RestPhase
    durationSeconds={session.restDuration}
    timer={timer}
    nextLabel={session.nextLabel}
    onContinue={session.confirmRest}
  />
)}

{session.phase === 'summary' && <SummaryPhase ... />}
```

---

## 10. Récapitulatif fichiers

| Fichier | Action |
|---|---|
| `db/migrations.ts` | Migration v5 : `ALTER TABLE exercises ADD COLUMN description TEXT` |
| `db/types.ts` | `Exercise.description: string \| null` |
| `db/seeds.ts` | Upsert description sur tous les exercices (44 descriptions) |
| `services/WorkoutExerciseService.ts` | Vérifier que `description` est bien exposé dans `WorkoutExerciseDetail` |
| `hooks/useSession.ts` | Nouvelles phases, `confirmTransition`, `confirmRest`, `restDuration`, `nextLabel`, `pendingPhase` state, `computeNextLabel` helper |
| `hooks/useSession.test.ts` | Tests `computeNextLabel` + transitions de phases |
| `components/session/RestPhase.tsx` | Nouveau composant |
| `components/session/ExerciseTransitionPhase.tsx` | Nouveau composant |
| `app/session/[workoutId].tsx` | Rendu nouvelles phases + timer refactorisé |

---

## Hors scope

- Timer circulaire SVG (backlog UX)
- Notification système (vibration in-app suffisante)
- Skip exercice complet
- Retour arrière sur série validée
