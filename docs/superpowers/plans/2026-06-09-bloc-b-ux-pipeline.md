# Bloc B UX Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit Rest and ExerciseTransition phases to the session pipeline, plus exercise descriptions for all 44 PPL exercises.

**Architecture:** New `SessionPhase` values (`exercise_transition`, `rest`) managed in `useSession` with `pendingPhase` state. Two new components handle each phase. Migration v5 adds `description TEXT` to exercises table, seeded via upsert on every app start.

**Tech Stack:** React Native / Expo SDK 54, TypeScript strict, SQLite expo-sqlite, Jest

---

## File Map

| File | Action |
|---|---|
| `app/db/schema.ts` | Add migration v5 (`description` column) |
| `app/db/types.ts` | Add `description: string \| null` to `Exercise` |
| `app/db/seeds.ts` | Add 44 descriptions; update `seedProgram` to upsert descriptions |
| `app/services/WorkoutExerciseService.ts` | Add `description` to `Pick` + `loadDetail` |
| `app/hooks/useSession.ts` | Export `computeNextLabel`; add new phases, state, methods |
| `app/hooks/useSession.test.ts` | Create — TDD for `computeNextLabel` |
| `app/components/session/RestPhase.tsx` | Create new component |
| `app/components/session/ExerciseTransitionPhase.tsx` | Create new component |
| `app/app/session/[workoutId].tsx` | New phase rendering + timer refactor |

---

### Task 1: Migration v5 + Exercise type

**Files:**
- Modify: `app/db/schema.ts`
- Modify: `app/db/types.ts`

- [ ] **Step 1: Add migration to schema.ts**

At the end of the `MIGRATIONS` array in `app/db/schema.ts`, add:

```ts
  // v5 — descriptions exercices
  `ALTER TABLE exercises ADD COLUMN description TEXT;`,
```

Full updated end of file:
```ts
  // v4 — cardio logging : durée et distance sur set_logs
  `ALTER TABLE set_logs ADD COLUMN duration_seconds INTEGER;`,
  `ALTER TABLE set_logs ADD COLUMN distance_meters REAL;`,

  // v5 — descriptions exercices
  `ALTER TABLE exercises ADD COLUMN description TEXT;`,
];
```

- [ ] **Step 2: Add description field to Exercise type**

In `app/db/types.ts`, update the `Exercise` interface:

```ts
export interface Exercise {
  id: number;
  name: string;
  type: ExerciseType;
  muscle_groups: string; // JSON array
  technical_notes: string | null;
  description: string | null;
  is_custom: 0 | 1;
  progression_step: number;
  progression_threshold: number;
  created_at: string;
}
```

- [ ] **Step 3: Typecheck**

```bash
cd app && npm run typecheck
```

Expected: no errors (migration is runtime-only; DB type now includes description).

- [ ] **Step 4: Commit**

```bash
git add app/db/schema.ts app/db/types.ts
git commit -m "feat(db): migration v5 — add description column to exercises"
```

---

### Task 2: WorkoutExerciseService — expose description

**Files:**
- Modify: `app/services/WorkoutExerciseService.ts`

- [ ] **Step 1: Add description to WorkoutExerciseDetail**

In `app/services/WorkoutExerciseService.ts`, update the `exercise` Pick type inside `WorkoutExerciseDetail`:

```ts
export interface WorkoutExerciseDetail {
  id: number;
  workout_id: number;
  order_index: number;
  exercise: Pick<Exercise, 'id' | 'name' | 'type' | 'technical_notes' | 'muscle_groups' | 'description'>;
  blocks: BlockWithSets[];
}
```

- [ ] **Step 2: Add description to loadDetail**

In the `loadDetail` private method (line 168 area), add `description`:

```ts
  private async loadDetail(we: WorkoutExercise, exercise: Exercise): Promise<WorkoutExerciseDetail> {
    const blocks = await this.blockRepo.findByWorkoutExerciseId(we.id);
    const blocksWithSets: BlockWithSets[] = await Promise.all(
      blocks.map(async (block: Block) => ({
        ...block,
        sets: await this.setRepo.findByBlockId(block.id),
      }))
    );
    return {
      id: we.id,
      workout_id: we.workout_id,
      order_index: we.order_index,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        type: exercise.type,
        technical_notes: exercise.technical_notes,
        muscle_groups: exercise.muscle_groups,
        description: exercise.description,
      },
      blocks: blocksWithSets,
    };
  }
```

- [ ] **Step 3: Typecheck**

```bash
cd app && npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/services/WorkoutExerciseService.ts
git commit -m "feat(service): expose exercise description in WorkoutExerciseDetail"
```

---

### Task 3: Seeds — 44 exercise descriptions

**Files:**
- Modify: `app/db/seeds.ts`

- [ ] **Step 1: Update EXTRA_EXERCISES upsert in seedProgram**

In `app/db/seeds.ts`, update the EXTRA_EXERCISES upsert loop inside `seedProgram` (lines 587-595) to add `description` support:

Replace the existing loop:
```ts
  for (const ex of EXTRA_EXERCISES) {
    const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM exercises WHERE name = ?', [ex.name]);
    if (!row) {
      await db.runAsync(
        'INSERT INTO exercises (name, type, muscle_groups, technical_notes, is_custom) VALUES (?, ?, ?, ?, 0)',
        [ex.name, ex.type, ex.muscle_groups, ex.technical_notes]
      );
    }
  }
```

With:
```ts
  for (const ex of EXTRA_EXERCISES) {
    const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM exercises WHERE name = ?', [ex.name]);
    if (!row) {
      await db.runAsync(
        'INSERT INTO exercises (name, type, muscle_groups, technical_notes, description, is_custom) VALUES (?, ?, ?, ?, ?, 0)',
        [ex.name, ex.type, ex.muscle_groups, ex.technical_notes, (ex as ExerciseDefinition).description ?? null]
      );
    } else {
      await db.runAsync(
        'UPDATE exercises SET description = ? WHERE id = ?',
        [(ex as ExerciseDefinition).description ?? null, row.id]
      );
    }
  }
```

- [ ] **Step 2: Add ExerciseDefinition type and descriptions map**

Add the following just before the `EXTRA_EXERCISES` declaration (before line 121):

```ts
type ExerciseDefinition = {
  name: string;
  type: string;
  muscle_groups: string;
  technical_notes: string | null;
  description?: string;
};
```

Then add this constant after `EXTRA_EXERCISES` array (before the `seedExercises` function):

```ts
// Descriptions for all PPL exercises (BASE + EXTRA). Applied on every seedProgram run.
const BASE_EXERCISE_DESCRIPTIONS: Record<string, string> = {
  'Développé couché barre': 'Barre dans l\'axe des mamelons, omoplates rétractées et déprimées contre le banc. Descente contrôlée jusqu\'au contact léger sur le thorax. Pousser en arc en gardant les coudes à 45-75° du tronc.',
  'Développé incliné haltères': 'Banc incliné 30-45°. Haltères en pronation, descente jusqu\'aux épaules, coudes légèrement en dessous de la ligne des épaules. Pousser en convergeant vers le haut.',
  'Élévations latérales haltères': 'Légère flexion des coudes, monter les bras jusqu\'à hauteur d\'épaules en rotation interne (pouces vers le bas). Descente lente et contrôlée. Éviter le balancement du buste.',
  'Dips': 'Buste légèrement penché vers l\'avant pour cibler les pectoraux. Descente jusqu\'à ce que les épaules soient sous les coudes. Pousser fort en haut sans verrouiller les coudes.',
  'Extension triceps poulie haute': 'Coudes fixes le long des oreilles, seuls les avant-bras bougent. Extension complète en bas, montée contrôlée. Éviter de décoller les coudes.',
  'Tractions': 'Prise en pronation, largeur épaules ou légèrement plus large. Initier le mouvement avec les dorsaux en déprimant les omoplates. Monter jusqu\'au menton au-dessus de la barre, descente complète pour étirer les grands dorsaux.',
  'Rowing barre': 'Buste à 45° ou horizontal, dos plat. Tirer la barre vers le nombril en serrant les omoplates à l\'arrivée. Descente complète et contrôlée. Coudes proches du corps.',
  'Squat barre': 'Barre sur les trapèzes (low bar ou high bar), pieds à largeur épaules légèrement ouverts. Descente en poussant les genoux dans l\'axe des orteils, buste droit. Profondeur minimum parallèle. Sortie explosive.',
};
```

- [ ] **Step 3: Add descriptions to EXTRA_EXERCISES objects**

Update the `EXTRA_EXERCISES` array to add `description` to each entry. The array starts at the declaration. Cast it as `ExerciseDefinition[]` by adding the type annotation:

```ts
const EXTRA_EXERCISES: ExerciseDefinition[] = [
  // ── Musculation PPL ────────────────────────────────────────────────────────
  {
    name: 'Crunch poulie haute',
    type: 'musculation',
    muscle_groups: '["abdominaux"]',
    technical_notes: 'Corde à la poulie haute. Enrouler le bassin vers le bas, ne pas tirer uniquement avec les bras.',
    description: 'Agenouillé face à la poulie, mains derrière la tête ou tenant la corde. Fléchir le buste en contractant les abdos, pas en tirant avec les bras.',
  },
  {
    name: 'Face pull',
    type: 'musculation',
    muscle_groups: '["deltoïdes postérieurs","trapèzes","rotateurs externes"]',
    technical_notes: 'Corde à la poulie haute, coudes hauts et en arrière. Tirer vers le visage. Compense le travail de poussée.',
    description: 'Poulie haute, prise en pronation ou neutre. Tirer vers le visage en ouvrant les coudes à 90°. Finir avec les mains derrière les oreilles. Ideal pour la santé des épaules.',
  },
  {
    name: 'Curl barre EZ',
    type: 'musculation',
    muscle_groups: '["biceps","brachial"]',
    technical_notes: 'Prise semi-supinée sur la barre EZ. Coudes fixes contre le buste. Amplitude complète.',
    description: 'Coudes fixes le long du corps. Montée jusqu\'à contraction maximale du biceps, descente lente et complète. La barre EZ réduit la pression sur les poignets.',
  },
  {
    name: 'Tirage poulie basse',
    type: 'musculation',
    muscle_groups: '["grand dorsal","rhomboïdes","biceps"]',
    technical_notes: 'Assis face à la poulie basse. Tirer vers le nombril, coudes proches du corps. Contraction maximale en fin de mouvement.',
    description: 'Assis face à la poulie, légère inclinaison du buste. Tirer vers le ventre en serrant les omoplates. Retour contrôlé en gardant le dos droit.',
  },
  {
    name: 'Relevés de jambes suspendu',
    type: 'musculation',
    muscle_groups: '["abdominaux","fléchisseurs de hanche"]',
    technical_notes: 'Suspendu à une barre. Lever les jambes en basculant le bassin vers le haut. Contrôler la descente.',
    description: 'Suspendu à la barre, jambes tendues ou genoux fléchis selon niveau. Monter les hanches en contractant les abdos, pas en se balançant. Descente lente.',
  },
  {
    name: 'Romanian Deadlift',
    type: 'musculation',
    muscle_groups: '["ischio-jambiers","fessiers","érecteurs du rachis"]',
    technical_notes: 'Dos neutre impératif. Barre proche des jambes, descendre jusqu\'à tension maximale des ischios. Genoux légèrement fléchis.',
    description: 'Barre proche du corps, jambes quasi-tendues (légère flexion). Descente en poussant les hanches vers l\'arrière, sentir l\'étirement des ischiojambiers. Remonter en contractant les fessiers.',
  },
  {
    name: 'Fentes bulgares',
    type: 'musculation',
    muscle_groups: '["quadriceps","fessiers","ischio-jambiers"]',
    technical_notes: 'Pied arrière posé sur un banc. Descente verticale du genou avant. Excellent pour l\'équilibre et le gainage unilatéral.',
    description: 'Pied arrière sur un banc, pied avant loin devant. Descendre en gardant le buste droit jusqu\'à ce que le genou arrière frôle le sol. Pousser sur le talon avant pour remonter.',
  },
  {
    name: 'Leg curl poulie',
    type: 'musculation',
    muscle_groups: '["ischio-jambiers"]',
    technical_notes: 'Debout ou à genoux face à la poulie basse. Flexion du genou, contraction maximale. Descente lente.',
    description: 'Allongé face vers le bas, chevilles fixées à la poulie. Fléchir les genoux jusqu\'à 90-130°, contracter les ischiojambiers en haut. Descente lente et complète.',
  },
  {
    name: 'Mollets debout sur step',
    type: 'musculation',
    muscle_groups: '["gastrocnémiens","soléaires"]',
    technical_notes: 'Amplitude maximale : descente complète, montée explosive. Descente 3 secondes. Dernière série : 10 demi-reps en bas.',
    description: 'Pied avant du step, talons dans le vide. Descente complète en bas pour étirer, montée sur la pointe des pieds en contractant les mollets. Pause d\'une seconde en haut.',
  },
  {
    name: 'Pin Press',
    type: 'musculation',
    muscle_groups: '["triceps","pectoraux","deltoïdes antérieurs"]',
    technical_notes: 'Barre posée sur les sécurités avant chaque répétition. Renforce la phase initiale de poussée du développé couché.',
    description: 'Press depuis les taquets à hauteur de poitrine, départ arrêté (pas d\'élan). Force pure sur la phase concentrique. Coudes sous la barre, gainage maximal.',
  },

  // ── Mobilité — avant séance ────────────────────────────────────────────────
  {
    name: 'Cercles épaules',
    type: 'etirement',
    muscle_groups: '["deltoïdes","coiffe des rotateurs"]',
    technical_notes: 'Grands cercles lents vers l\'avant puis vers l\'arrière. Amplitude maximale.',
    description: 'Bras tendus, grands cercles lents vers l\'avant puis vers l\'arrière. Ampleur maximale à chaque rotation. Déverrouille l\'articulation gléno-humérale.',
  },
  {
    name: 'Rotations thoraciques',
    type: 'etirement',
    muscle_groups: '["érecteurs du rachis","obliques"]',
    technical_notes: 'Assis ou à quatre pattes. Rotation du torse en ouvrant le coude vers le plafond. Reps = par côté.',
    description: 'En quadrupédie ou assis. Placer une main derrière la tête, ouvrir le coude vers le plafond en faisant pivoter le thorax. Garder les hanches stables.',
  },
  {
    name: 'Band pull-aparts',
    type: 'etirement',
    muscle_groups: '["deltoïdes postérieurs","rhomboïdes","trapèzes"]',
    technical_notes: 'Bras tendus devant soi, élastique horizontal. Écarter les bras jusqu\'à toucher la poitrine. Coudes légèrement fléchis.',
    description: 'Bras tendus devant soi, élastique tenu en pronation. Ouvrir les bras jusqu\'à toucher la poitrine avec l\'élastique, serrer les omoplates. Retour lent.',
  },
  {
    name: 'Suspension passive',
    type: 'etirement',
    muscle_groups: '["érecteurs du rachis","grand dorsal","épaules"]',
    technical_notes: 'Suspendu à une barre, relâcher complètement le dos. Décompresse la colonne vertébrale.',
    description: 'Suspendu à la barre, corps détendu, épaules qui montent vers les oreilles. Laisser le poids du corps décompresser la colonne et les épaules. Respirer profondément.',
  },
  {
    name: 'Cat-cow',
    type: 'etirement',
    muscle_groups: '["érecteurs du rachis","abdominaux"]',
    technical_notes: 'À quatre pattes. Alterner arrondi du dos (cat) et creux du dos (cow). Synchroniser avec la respiration.',
    description: 'En quadrupédie. Inspiration : creuser le dos, lever la tête et le coccyx (cow). Expiration : arrondir le dos, rentrer le menton et le bassin (cat). Mouvements fluides et synchronisés avec la respiration.',
  },
  {
    name: 'Hip hinge léger',
    type: 'etirement',
    muscle_groups: '["ischio-jambiers","fessiers","érecteurs du rachis"]',
    technical_notes: 'Debout, mains sur les hanches. Charnière au niveau des hanches, dos plat. Activation de la chaîne postérieure.',
    description: 'Pieds à largeur d\'épaules, léger fléchissement des genoux. Pousser les hanches vers l\'arrière en gardant le dos plat, sentir l\'activation des ischiojambiers. Retour debout en poussant les hanches vers l\'avant.',
  },
  {
    name: 'Rotations poignets',
    type: 'etirement',
    muscle_groups: '["poignets","avant-bras"]',
    technical_notes: 'Bras tendus devant soi. Grands cercles lents dans les deux sens. Reps = par côté.',
    description: 'Bras tendus devant soi, faire des cercles avec les poignets dans les deux sens. Amplitude maximale. Prépare les articulations pour les mouvements de pressing.',
  },

  // ── Étirements — après séance ──────────────────────────────────────────────
  {
    name: 'Étirement pectoraux au mur',
    type: 'etirement',
    muscle_groups: '["pectoraux","deltoïdes antérieurs"]',
    technical_notes: 'Bras à 90° contre un mur. Rotation lente du corps vers l\'opposé. Durée par côté.',
    description: 'Bras à 90°, main et avant-bras contre le mur. Faire pivoter le corps vers l\'opposé jusqu\'à ressentir l\'étirement au niveau du pectoral et de l\'épaule. Maintenir sans forcer.',
  },
  {
    name: 'Child pose',
    type: 'etirement',
    muscle_groups: '["grand dorsal","érecteurs du rachis","épaules"]',
    technical_notes: 'À genoux, bras tendus devant soi, front au sol. Respiration profonde.',
    description: 'Agenouillé, fesses vers les talons, bras tendus devant soi ou le long du corps. Relâcher complètement le dos et les épaules. Respiration abdominale profonde.',
  },
  {
    name: 'Couch stretch',
    type: 'etirement',
    muscle_groups: '["fléchisseurs de hanche","quadriceps"]',
    technical_notes: 'Pied arrière contre un mur, genou au sol. Avancer les hanches. Critique pour les coureurs. Durée par côté.',
    description: 'Un genou au sol contre un mur, l\'autre pied devant. Redresser le buste pour intensifier l\'étirement du hip flexor et du quad. Tenir en respirant.',
  },
  {
    name: 'Respiration diaphragmatique',
    type: 'etirement',
    muscle_groups: '["diaphragme"]',
    technical_notes: 'Allongé sur le dos. Inspiration 4 sec, rétention 4 sec, expiration 6 sec. Durée totale.',
    description: 'Allongé sur le dos, une main sur le ventre. Inspirer 4 secondes en gonflant le ventre, expirer 6 secondes en le rentrant. Active le système parasympathique, récupération active.',
  },
  {
    name: 'Étirement dorsaux',
    type: 'etirement',
    muscle_groups: '["grand dorsal","rhomboïdes"]',
    technical_notes: 'Bras croisés, traction vers la poitrine ou étirement latéral suspendu.',
    description: 'Assis, saisir une barre ou l\'encadrement d\'une porte. Pousser les hanches vers l\'arrière en arrondissant le dos pour étirer les grands dorsaux.',
  },
  {
    name: 'Child pose latéral',
    type: 'etirement',
    muscle_groups: '["grand dorsal","intercostaux","obliques"]',
    technical_notes: 'Child pose avec bras décalés vers le côté. Tire la chaîne latérale. Durée par côté.',
    description: 'Depuis child pose, marcher les mains vers un côté pour cibler le grand dorsal et les obliques. Maintenir en respirant.',
  },
  {
    name: 'Figure 4 stretch',
    type: 'etirement',
    muscle_groups: '["piriforme","fessiers","rotateurs externes de hanche"]',
    technical_notes: 'Allongé sur le dos, cheville posée sur le genou opposé. Tirer la cuisse vers la poitrine. Durée par côté.',
    description: 'Allongé sur le dos, cheville sur le genou opposé. Tirer la jambe inférieure vers la poitrine pour étirer le piriforme et le fessier.',
  },
  {
    name: 'Deep squat hold',
    type: 'etirement',
    muscle_groups: '["hanches","chevilles","fessiers","adducteurs"]',
    technical_notes: 'Position squat profond maintenue, talons au sol si possible. Coudes contre les genoux pour ouvrir les hanches.',
    description: 'Descendre en squat profond, talons au sol, bras tendus entre les genoux pour garder l\'équilibre. Relâcher progressivement les hanches, hanches, et chevilles.',
  },
  {
    name: 'Leg swings avant/arrière',
    type: 'etirement',
    muscle_groups: '["fléchisseurs de hanche","ischio-jambiers"]',
    technical_notes: 'Debout, appui sur un mur. Balancer la jambe en pendule avant/arrière. Amplitude progressive. Reps = par jambe.',
    description: 'Debout sur un pied, balancer l\'autre jambe d\'avant en arrière avec amplitude croissante. Tenir un support si besoin. Déverrouille la hanche en flexion/extension.',
  },
  {
    name: 'Leg swings latéraux',
    type: 'etirement',
    muscle_groups: '["abducteurs","adducteurs","fléchisseurs de hanche"]',
    technical_notes: 'Debout, appui sur un mur. Balancer la jambe latéralement. Amplitude progressive. Reps = par jambe.',
    description: 'Debout sur un pied, balancer l\'autre jambe latéralement avec amplitude croissante. Déverrouille l\'abduction/adduction de hanche.',
  },
  {
    name: 'Cossack squat',
    type: 'etirement',
    muscle_groups: '["adducteurs","hanches","chevilles","quadriceps"]',
    technical_notes: 'Squat latéral alterné. Jambe tendue d\'un côté, genou fléchi de l\'autre. Excellent pour la mobilité de hanche.',
    description: 'Pieds très écartés (2x largeur épaules). Fléchir sur un côté en gardant l\'autre jambe tendue, pied à plat. Alterner les côtés en passant par le centre.',
  },
  {
    name: 'Étirement mollets',
    type: 'etirement',
    muscle_groups: '["gastrocnémiens","soléaires"]',
    technical_notes: 'Contre un mur ou sur un step. Jambe tendue pour gastrocnémien, légèrement fléchie pour soléaire. Durée par côté.',
    description: 'Debout face à un mur, pied avant plié, pied arrière tendu talon au sol. Avancer le buste vers le mur pour intensifier. Maintenir en respirant. Effectuer les deux pieds.',
  },
  {
    name: 'Butterfly stretch',
    type: 'etirement',
    muscle_groups: '["adducteurs","fléchisseurs de hanche"]',
    technical_notes: 'Assis, plantes de pieds jointes, genoux vers le sol. Pencher légèrement le buste vers l\'avant.',
    description: 'Assis, plantes des pieds collées, genoux ouverts vers le sol. Se pencher légèrement en avant, pousser doucement les genoux vers le bas avec les coudes.',
  },
  {
    name: 'Pigeon pose',
    type: 'etirement',
    muscle_groups: '["piriforme","fessiers","fléchisseurs de hanche"]',
    technical_notes: 'Jambe avant à 90°, jambe arrière tendue. Étirement profond des hanches. Essentiel pour les coureurs. Durée par côté.',
    description: 'Depuis une planche, amener le genou avant vers la main homolatérale, jambe arrière tendue. S\'abaisser vers le sol pour étirer le piriforme et le fessier. Maintenir en respirant profondément.',
  },
  {
    name: 'Étirement épaule cross-body',
    type: 'etirement',
    muscle_groups: '["deltoïdes postérieurs","rhomboïdes"]',
    technical_notes: 'Bras croisé devant la poitrine, maintenu par le bras opposé. Durée par côté.',
    description: 'Bras tendu passé devant le buste, l\'autre bras le tire vers l\'épaule opposée. Maintenir sans hausser l\'épaule. Relâcher les trapèzes.',
  },

  // ── Footing + mobilité multi-plan ─────────────────────────────────────────
  {
    name: 'Footing',
    type: 'cardio',
    muscle_groups: '["cardio","membres inférieurs"]',
    technical_notes: 'Course continue. Durée variable (20–40 min). Valider quand le footing est terminé.',
    description: 'Cadence cible 170-180 pas/min pour réduire l\'impact. Atterrissage sous le centre de gravité, pas en talon. Respiration rythmée 2-2 (2 pas inspire, 2 pas expire) ou 3-2 selon l\'intensité.',
  },
  {
    name: "World's Greatest Stretch",
    type: 'etirement',
    muscle_groups: '["fléchisseurs de hanche","ischio-jambiers","thoracique","épaules"]',
    technical_notes: 'Fente avant avec main au sol, rotation du buste en levant le bras vers le plafond. Mobilité multi-plan. Reps = par côté.',
    description: 'Fente avant, main homolatérale au sol. Amener le coude vers le sol puis ouvrir le bras vers le plafond en rotation thoracique. Alterner les côtés. Mobilise hanche, thorax et épaule en un seul mouvement.',
  },
  {
    name: 'Pancake stretch',
    type: 'etirement',
    muscle_groups: '["adducteurs","ischio-jambiers","érecteurs du rachis"]',
    technical_notes: 'Assis au sol, jambes écartées au maximum. Incliner doucement le buste vers l\'avant, dos droit. Début de travail grand écart latéral. Progressif, sans forcer.',
    description: 'Assis au sol, jambes tendues très écartées. Se pencher vers l\'avant en gardant le dos plat, tenter de poser la poitrine au sol. Progresser sans forcer.',
  },
  {
    name: 'Frog stretch',
    type: 'etirement',
    muscle_groups: '["adducteurs","hanches","fléchisseurs de hanche"]',
    technical_notes: 'À quatre pattes, genoux écartés au-delà de la largeur des hanches, pieds vers l\'extérieur. Reculer doucement les fesses. TRÈS léger — pas de douleur articulaire. Début de travail grand écart latéral.',
    description: 'En quadrupédie, écarter les genoux au maximum en gardant les pieds dans l\'axe des genoux. S\'asseoir progressivement vers l\'arrière. Ouverture profonde des hanches.',
  },
];
```

- [ ] **Step 4: Add base exercise descriptions pass in seedProgram**

In `app/db/seeds.ts`, inside `seedProgram`, add this pass AFTER the EXTRA_EXERCISES upsert loop and BEFORE the `const allEx = ...` line:

```ts
  // Update descriptions for BASE_EXERCISES (can't re-INSERT since seedExercises guards on count)
  for (const [name, desc] of Object.entries(BASE_EXERCISE_DESCRIPTIONS)) {
    await db.runAsync('UPDATE exercises SET description = ? WHERE name = ?', [desc, name]);
  }
```

- [ ] **Step 5: Run tests**

```bash
cd app && npm test
```

Expected: all tests pass (no DB tests for seeds, but no regressions).

- [ ] **Step 6: Typecheck**

```bash
cd app && npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/db/seeds.ts
git commit -m "feat(seeds): add 44 exercise descriptions — upsert on every seedProgram run"
```

---

### Task 4: computeNextLabel — TDD

**Files:**
- Modify: `app/hooks/useSession.ts` — export `computeNextLabel`
- Create: `app/hooks/useSession.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/hooks/useSession.test.ts`:

```ts
import { computeNextLabel, advancePosition } from './useSession';
import type { SessionPosition } from './useSession';
import type { WorkoutExerciseDetail } from '../services/WorkoutExerciseService';

function makeExercise(name: string, weight: number | null = 80, sets = 3): WorkoutExerciseDetail {
  return {
    id: 1,
    workout_id: 1,
    order_index: 0,
    exercise: {
      id: 1,
      name,
      type: 'musculation',
      technical_notes: null,
      muscle_groups: '[]',
      description: null,
    },
    blocks: [
      {
        id: 1,
        name: 'Travail',
        order_index: 0,
        is_work_block: 1,
        sets: Array.from({ length: sets }, (_, i) => ({
          id: i + 1,
          block_id: 1,
          reps_min: 8,
          reps_max: 8,
          weight,
          weight_type: 'fixed' as const,
          rest_duration: 90,
          order_index: i,
          duration_seconds: null,
        })),
      },
    ],
  };
}

describe('computeNextLabel', () => {
  it('returns exercise name when exercise changes', () => {
    const exercises = [makeExercise('Squat barre'), makeExercise('Rowing barre')];
    const next: SessionPosition = { exerciseIdx: 1, blockIdx: 0, setIdx: 0 };
    expect(computeNextLabel(next, exercises, true)).toBe('Exercice suivant : Rowing barre');
  });

  it('returns set info within same exercise with weight', () => {
    const exercises = [makeExercise('Squat barre', 80, 4)];
    const next: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 2 };
    expect(computeNextLabel(next, exercises, false)).toBe('Série 3/4 — 80kg');
  });

  it('omits weight when null', () => {
    const exercises = [makeExercise('Tractions', null, 3)];
    const next: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 1 };
    expect(computeNextLabel(next, exercises, false)).toBe('Série 2/3');
  });

  it('shows set 1/N for first set', () => {
    const exercises = [makeExercise('Squat barre', 100, 4)];
    const next: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 0 };
    expect(computeNextLabel(next, exercises, false)).toBe('Série 1/4 — 100kg');
  });
});

describe('advancePosition', () => {
  it('advances setIdx within block', () => {
    const exercises = [makeExercise('A', 80, 3)];
    const pos: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 0 };
    expect(advancePosition(pos, exercises)).toEqual({ exerciseIdx: 0, blockIdx: 0, setIdx: 1 });
  });

  it('returns null at last set of last exercise', () => {
    const exercises = [makeExercise('A', 80, 2)];
    const pos: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 1 };
    expect(advancePosition(pos, exercises)).toBeNull();
  });

  it('advances to next exercise', () => {
    const exercises = [makeExercise('A', 80, 1), makeExercise('B', 80, 1)];
    const pos: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 0 };
    expect(advancePosition(pos, exercises)).toEqual({ exerciseIdx: 1, blockIdx: 0, setIdx: 0 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd app && npm test -- --testPathPattern=useSession
```

Expected: FAIL — `computeNextLabel` is not exported from `useSession`.

- [ ] **Step 3: Export computeNextLabel from useSession.ts**

In `app/hooks/useSession.ts`, add the `computeNextLabel` function after `advancePosition`. The function is already designed in the spec — add it as an export:

```ts
export function computeNextLabel(
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd app && npm test -- --testPathPattern=useSession
```

Expected: all tests PASS.

- [ ] **Step 5: Typecheck**

```bash
cd app && npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/hooks/useSession.ts app/hooks/useSession.test.ts
git commit -m "feat(session): export computeNextLabel — TDD"
```

---

### Task 5: useSession — new phases and transitions

**Files:**
- Modify: `app/hooks/useSession.ts`

- [ ] **Step 1: Update SessionPhase type and UseSessionResult interface**

In `app/hooks/useSession.ts`, replace:

```ts
export type SessionPhase = 'checkin' | 'running' | 'summary';
```

With:

```ts
export type SessionPhase = 'checkin' | 'exercise_transition' | 'running' | 'rest' | 'summary';
```

Update `UseSessionResult` to add the new fields and methods:

```ts
export interface UseSessionResult {
  phase: SessionPhase;
  sessionLogId: number | null;
  position: SessionPosition;
  currentExercise: WorkoutExerciseDetail | null;
  currentBlock: BlockWithSets | null;
  currentSet: TrainingSet | null;
  progressLabel: string;
  startSession: (checkin: CheckIn) => Promise<void>;
  validateSet: (actual: SetActual) => Promise<void>;
  skipSet: () => void;
  setStartingWeight: (weight: number) => Promise<void>;
  confirmTransition: () => void;
  confirmRest: () => void;
  restDuration: number;
  nextLabel: string;
  progressions: ProgressionResult[];
  sessionStartedAt: number | null;
  totalSetsLogged: number;
  error: string | null;
}
```

- [ ] **Step 2: Add new state variables**

Inside `useSession`, after the existing state declarations (after `const [error, setError] = useState<string | null>(null);`), add:

```ts
  const [restDuration, setRestDuration] = useState(90);
  const [pendingPhase, setPendingPhase] = useState<'running' | 'exercise_transition'>('running');
  const [nextLabel, setNextLabel] = useState('');
```

- [ ] **Step 3: Update startSession to go to exercise_transition**

Replace the `setPhase('running')` call inside `startSession`:

```ts
  const startSession = useCallback(async (checkin: CheckIn) => {
    try {
      const log = await service.startSession(workoutId, checkin);
      setSessionLogId(log.id);
      setSessionStartedAt(Date.now());
      setPhase('exercise_transition');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur démarrage séance');
    }
  }, [service, workoutId]);
```

- [ ] **Step 4: Update validateSet to go through rest phase**

Replace the entire `validateSet` callback:

```ts
  const validateSet = useCallback(async (actual: SetActual) => {
    if (!sessionLogId || !currentSet || !currentExercise) return;
    try {
      await service.logSet(sessionLogId, currentSet.id, currentExercise.exercise.id, actual);
      setTotalSetsLogged(n => n + 1);

      const completedRestDuration = currentSet.rest_duration;
      const next = advancePosition(position, workoutDetails);

      if (next === null) {
        await service.completeSession(sessionLogId);
        try {
          const progs = await service.calculateProgressions(sessionLogId);
          setProgressions(progs);
        } catch {
          setProgressions([]);
        }
        setPhase('summary');
        return;
      }

      const exerciseChanges = next.exerciseIdx !== position.exerciseIdx;
      setRestDuration(completedRestDuration);
      setPendingPhase(exerciseChanges ? 'exercise_transition' : 'running');
      setNextLabel(computeNextLabel(next, workoutDetails, exerciseChanges));
      setPosition(next);
      setPhase('rest');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur validation série');
    }
  }, [service, sessionLogId, currentSet, currentExercise, position, workoutDetails]);
```

- [ ] **Step 5: Add confirmRest and confirmTransition callbacks**

After the `validateSet` callback, add:

```ts
  const confirmRest = useCallback(() => {
    setPhase(pendingPhase);
  }, [pendingPhase]);

  const confirmTransition = useCallback(() => {
    setPhase('running');
  }, []);
```

- [ ] **Step 6: Update return value**

Replace the return statement with:

```ts
  return {
    phase, sessionLogId, position,
    currentExercise, currentBlock, currentSet, progressLabel,
    startSession, validateSet, skipSet, setStartingWeight,
    confirmTransition, confirmRest, restDuration, nextLabel,
    progressions, sessionStartedAt, totalSetsLogged, error,
  };
```

- [ ] **Step 7: Run tests**

```bash
cd app && npm test -- --testPathPattern=useSession
```

Expected: all tests pass (computeNextLabel tests still pass; no regression).

- [ ] **Step 8: Typecheck**

```bash
cd app && npm run typecheck
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add app/hooks/useSession.ts
git commit -m "feat(session): new phases exercise_transition + rest — confirmRest/confirmTransition"
```

---

### Task 6: RestPhase component

**Files:**
- Create: `app/components/session/RestPhase.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/session/RestPhase.tsx`:

```tsx
// app/components/session/RestPhase.tsx
import { View, Text, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { UseTimerResult } from '@/hooks/useTimer';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface RestPhaseProps {
  durationSeconds: number;
  timer: UseTimerResult;
  nextLabel: string;
  onContinue: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RestPhase({ durationSeconds, timer, nextLabel, onContinue }: RestPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isDone = timer.remaining === 0 && !timer.isRunning;
  const progress = durationSeconds > 0 ? timer.remaining / durationSeconds : 0;

  return (
    <View style={[styles.container, { backgroundColor: isDone ? '#16a34a15' : colors.background }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>REPOS</Text>

      <Text
        style={[styles.timerText, { color: isDone ? '#16a34a' : colors.primary }]}
        accessibilityLabel={`Temps de repos restant : ${timer.remaining} secondes`}
      >
        {formatTime(timer.remaining)}
      </Text>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: isDone ? '#16a34a' : colors.primary,
              width: `${Math.round(progress * 100)}%`,
            },
          ]}
        />
      </View>

      <Text style={[styles.nextLabel, { color: colors.textSecondary }]}>{nextLabel}</Text>

      <PressableA11y
        accessibilityLabel={isDone ? "C'est parti, continuer la séance" : 'Passer le repos'}
        onPress={onContinue}
        style={[
          styles.continueBtn,
          isDone
            ? { backgroundColor: colors.primary }
            : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.continueBtnText,
            { color: isDone ? (colorScheme === 'dark' ? '#000' : '#fff') : colors.textSecondary },
          ]}
        >
          {isDone ? "C'est parti →" : 'Passer →'}
        </Text>
      </PressableA11y>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  timerText: {
    fontSize: 72,
    fontWeight: '700',
    letterSpacing: -2,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
  },
  nextLabel: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
  },
  continueBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: 'auto',
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
cd app && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/session/RestPhase.tsx
git commit -m "feat(session): RestPhase component — timer display + progress bar"
```

---

### Task 7: ExerciseTransitionPhase component

**Files:**
- Create: `app/components/session/ExerciseTransitionPhase.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/session/ExerciseTransitionPhase.tsx`:

```tsx
// app/components/session/ExerciseTransitionPhase.tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface ExerciseTransitionPhaseProps {
  exercise: WorkoutExerciseDetail;
  exerciseNumber: number;
  totalExercises: number;
  onContinue: () => void;
}

function getTypeColor(type: string, primaryColor: string): string {
  if (type === 'etirement') return '#16a34a';
  if (type === 'cardio') return '#ea580c';
  return primaryColor;
}

function getWorkSummary(exercise: WorkoutExerciseDetail): string {
  if (exercise.exercise.type === 'cardio') return 'Cardio';
  const travail = exercise.blocks.find(b => b.is_work_block === 1 && b.name === 'Travail');
  if (travail && travail.sets.length > 0) {
    const s = travail.sets[0];
    const repsLabel =
      s.reps_min === s.reps_max ? `${s.reps_min} reps` : `${s.reps_min}–${s.reps_max} reps`;
    return `${travail.sets.length} série${travail.sets.length > 1 ? 's' : ''} × ${repsLabel} — ${s.rest_duration}s repos`;
  }
  const firstSet = exercise.blocks[0]?.sets[0];
  if (firstSet?.duration_seconds) {
    const m = Math.floor(firstSet.duration_seconds / 60);
    const s = firstSet.duration_seconds % 60;
    return m > 0 ? `${m}min${s > 0 ? ` ${s}s` : ''}` : `${s}s`;
  }
  return '';
}

export function ExerciseTransitionPhase({
  exercise,
  exerciseNumber,
  totalExercises,
  onContinue,
}: ExerciseTransitionPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const typeColor = getTypeColor(exercise.exercise.type, colors.primary);
  const workSummary = getWorkSummary(exercise);
  const description = exercise.exercise.description;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Color stripe */}
      <View style={[styles.stripe, { backgroundColor: typeColor }]} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.exerciseLabel, { color: colors.textSecondary }]}>
          {`EXERCICE ${exerciseNumber}/${totalExercises}`}
        </Text>

        <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={2}>
          {exercise.exercise.name}
        </Text>

        {workSummary ? (
          <Text style={[styles.workSummary, { color: colors.textSecondary }]}>
            {workSummary}
          </Text>
        ) : null}

        {description ? (
          <>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <Text style={[styles.description, { color: colors.text }]}>{description}</Text>
          </>
        ) : null}

        <PressableA11y
          accessibilityLabel={`Commencer l'exercice ${exercise.exercise.name}`}
          onPress={onContinue}
          style={[styles.continueBtn, { backgroundColor: typeColor }]}
        >
          <Text style={styles.continueBtnText}>C'est parti →</Text>
        </PressableA11y>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  stripe: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    gap: 12,
  },
  exerciseLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  workSummary: {
    fontSize: 15,
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  continueBtn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: 'auto',
    marginTop: 24,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
cd app && npm run typecheck
```

Expected: no errors. Note: TypeScript may warn about duplicate `marginTop` in styles — if so, remove the first `marginTop: 'auto'` and keep `marginTop: 24`.

- [ ] **Step 3: Fix duplicate marginTop if present**

If typecheck flags the duplicate, replace in the styles:
```ts
  continueBtn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: 24,
  },
```

- [ ] **Step 4: Commit**

```bash
git add app/components/session/ExerciseTransitionPhase.tsx
git commit -m "feat(session): ExerciseTransitionPhase component — exercise preview + description"
```

---

### Task 8: Session screen — wiring

**Files:**
- Modify: `app/app/session/[workoutId].tsx`

- [ ] **Step 1: Update imports**

In `app/app/session/[workoutId].tsx`, add the two new component imports:

```ts
import { RestPhase } from '@/components/session/RestPhase';
import { ExerciseTransitionPhase } from '@/components/session/ExerciseTransitionPhase';
```

- [ ] **Step 2: Replace timer useEffect (position-based → phase-based)**

Remove the old timer effect that used `prevPositionRef`:

```ts
// DELETE THIS BLOCK:
const prevPositionRef = useRef(session.position);
useEffect(() => {
  if (
    session.phase === 'running' &&
    session.position !== prevPositionRef.current &&
    session.currentSet
  ) {
    timer.reset(session.currentSet.rest_duration);
    timer.start();
  }
  prevPositionRef.current = session.position;
}, [session.position, session.phase, session.currentSet]);
```

Replace with:

```ts
useEffect(() => {
  if (session.phase === 'rest') {
    timer.reset(session.restDuration);
    timer.start();
  }
}, [session.phase, session.restDuration]);
```

Also remove the `useRef` import if it was only used for `prevPositionRef` — check if still needed (it may still be used elsewhere; if not, remove it from the import line).

- [ ] **Step 3: Update the render return**

Replace the entire return body (inside the `<View>` container) with:

```tsx
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {session.phase === 'checkin' && (
          <CheckInPhase onStart={session.startSession} />
        )}

        {session.phase === 'exercise_transition' && session.currentExercise && (
          <ExerciseTransitionPhase
            exercise={session.currentExercise}
            exerciseNumber={session.position.exerciseIdx + 1}
            totalExercises={exercises.length}
            onContinue={session.confirmTransition}
          />
        )}

        {session.phase === 'running' && session.currentSet && session.currentBlock && session.currentExercise && (
          needsStartingWeight ? (
            <ExerciseStartingWeightPhase
              exercise={session.currentExercise}
              onConfirm={handleStartingWeightConfirm}
            />
          ) : (
            <RunningPhase
              key={session.currentSet.id}
              exercise={session.currentExercise}
              block={session.currentBlock}
              set={session.currentSet}
              progressLabel={session.progressLabel}
              timer={timer}
              onValidate={session.validateSet}
              onSkip={session.skipSet}
            />
          )
        )}

        {session.phase === 'rest' && (
          <RestPhase
            durationSeconds={session.restDuration}
            timer={timer}
            nextLabel={session.nextLabel}
            onContinue={session.confirmRest}
          />
        )}

        {session.phase === 'summary' && (
          <SummaryPhase
            progressions={session.progressions}
            totalSets={session.totalSetsLogged}
            durationSeconds={session.sessionStartedAt ? Math.round((Date.now() - session.sessionStartedAt) / 1000) : 0}
            onClose={handleBack}
          />
        )}
      </View>
```

- [ ] **Step 4: Check useRef import**

If `useRef` is no longer used (after removing `prevPositionRef`), remove it from the React import line:

```ts
import { useEffect, useCallback, useMemo } from 'react';
```

If it IS still used elsewhere in the file, leave it.

- [ ] **Step 5: Run full tests**

```bash
cd app && npm test
```

Expected: all tests pass.

- [ ] **Step 6: Typecheck**

```bash
cd app && npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/app/session/[workoutId].tsx
git commit -m "feat(session): wire RestPhase + ExerciseTransitionPhase — refactor timer to phase-based"
```

---

## Self-Review

### Spec coverage check

| Spec section | Task |
|---|---|
| Migration v5 `description TEXT` | Task 1 |
| `Exercise.description: string \| null` in types | Task 1 |
| `WorkoutExerciseDetail.exercise` exposes description | Task 2 |
| 44 PPL exercise descriptions in seeds | Task 3 |
| EXTRA_EXERCISES upsert with description | Task 3 |
| BASE_EXERCISES descriptions via separate pass | Task 3 |
| `computeNextLabel` pure helper, exported | Task 4 |
| `SessionPhase` includes `exercise_transition` \| `rest` | Task 5 |
| `startSession` → `exercise_transition` | Task 5 |
| `validateSet` → captures `completedRestDuration`, goes to `rest` | Task 5 |
| `pendingPhase` state (`running` \| `exercise_transition`) | Task 5 |
| `confirmRest` → `setPhase(pendingPhase)` | Task 5 |
| `confirmTransition` → `setPhase('running')` | Task 5 |
| `skipSet` unchanged (bypass rest + transition) | Task 5 — no change needed |
| `RestPhase` component with timer, progress bar, visual zero state | Task 6 |
| Timer started by screen on `rest` phase entry (not by component) | Tasks 6 + 8 |
| No auto-advance — user taps always | Task 6 |
| `ExerciseTransitionPhase` — color stripe, exercise name, work summary, description | Task 7 |
| Session screen wiring — all 5 phases rendered | Task 8 |
| Timer refactor: phase-based not position-based | Task 8 |

### No placeholders detected

All code blocks contain complete implementations. No TBD/TODO in any step.

### Type consistency check

- `WorkoutExerciseDetail.exercise` now includes `description` — consistent from Task 2 through Tasks 7 and 8
- `SessionPhase` updated in Task 5 — used in Tasks 6, 7, 8 via `session.phase`
- `UseSessionResult` extended in Task 5 — `session.confirmTransition`, `session.confirmRest`, `session.restDuration`, `session.nextLabel` all used in Task 8
- `computeNextLabel` exported in Task 4, used in Task 5 (`validateSet`)
- `ExerciseDefinition` type added in Task 3 — cast applied inline

---

**Plan saved.**
