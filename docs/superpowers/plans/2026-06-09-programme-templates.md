# Programme Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre d'importer 5 programmes d'entraînement pré-construits (5x5 Stronglifts, Full Body 3j, Upper/Lower 4j, Bro Split 5j, Arnold Split 6j) depuis l'onglet Programmes via un bottom sheet + écran d'import.

**Architecture:** Templates définis comme objets TypeScript dans `app/data/templates.ts`. `TemplateService.importTemplate()` utilise les repos existants (aucun SQL direct). Migration v7 ajoute `template_id TEXT` sur `programs`. UI : FAB → `@gorhom/bottom-sheet` → `/import-template` modal → import.

**Tech Stack:** TypeScript strict, Expo SQLite, React Native 0.81, @gorhom/bottom-sheet, react-native-gesture-handler, Jest

---

## File Map

| Fichier | Action | Rôle |
|---|---|---|
| `app/db/schema.ts` | Modifier | Migration v7 : `template_id TEXT` sur `programs` |
| `app/db/types.ts` | Modifier | `template_id: string \| null` sur `Program` |
| `app/db/seeds.ts` | Modifier | 7 nouveaux exercices dans `EXTRA_EXERCISES` |
| `app/repositories/IProgramRepository.ts` | Modifier | `template_id?` optionnel dans `CreateProgramDto` |
| `app/repositories/SQLiteProgramRepository.ts` | Modifier | INSERT inclut `template_id` |
| `app/repositories/InMemoryProgramRepository.ts` | Modifier | `save()` inclut `template_id: dto.template_id ?? null` |
| `app/data/templates.ts` | Créer | 5 définitions TypeScript + types `TemplateDefinition` |
| `app/services/TemplateService.ts` | Créer | `importTemplate()` + `isTemplateImported()` |
| `app/services/TemplateService.test.ts` | Créer | 7 tests unitaires |
| `app/components/programmes/AddProgrammeBottomSheet.tsx` | Créer | BottomSheet 2 choix |
| `app/app/import-template.tsx` | Créer | Écran modal d'import |
| `app/app/_layout.tsx` | Modifier | GestureHandlerRootView + route import-template |
| `app/app/(tabs)/programmes.tsx` | Modifier | FAB → BottomSheet |

---

## Task 1 — Setup @gorhom/bottom-sheet

**Files:**
- Modify: `app/app/_layout.tsx`

- [ ] **Step 1: Installer les dépendances**

```bash
cd C:\Users\sylva\projects\training-app\app && npx expo install @gorhom/bottom-sheet react-native-gesture-handler
```

Expected: packages ajoutés dans `package.json` (versions compatibles Expo SDK 54 résolues par expo).

- [ ] **Step 2: Modifier `app/app/_layout.tsx`**

Ajouter l'import en tête de fichier (après `'react-native-reanimated'`) :

```ts
import { GestureHandlerRootView } from 'react-native-gesture-handler';
```

Modifier `RootLayoutNav` pour wrapper dans `GestureHandlerRootView` :

```tsx
function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-exercise"
            options={{ presentation: 'modal', title: 'Nouvel exercice' }}
          />
          <Stack.Screen
            name="add-programme"
            options={{ presentation: 'modal', title: 'Programme' }}
          />
          <Stack.Screen
            name="programme/[id]"
            options={{ title: 'Programme' }}
          />
          <Stack.Screen
            name="add-workout"
            options={{ presentation: 'modal', title: 'Séance' }}
          />
          <Stack.Screen
            name="workout/[id]"
            options={{ title: 'Séance' }}
          />
          <Stack.Screen
            name="add-workout-exercise"
            options={{ presentation: 'modal', title: 'Ajouter un exercice' }}
          />
          <Stack.Screen
            name="session/[workoutId]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="history/[sessionLogId]"
            options={{ title: 'Détail séance' }}
          />
          <Stack.Screen
            name="progression/[exerciseId]"
            options={{ title: 'Progression' }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd C:\Users\sylva\projects\training-app\app && npx tsc --noEmit 2>&1
```

Expected: 0 erreurs.

- [ ] **Step 4: Tests**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest --no-coverage 2>&1 | tail -5
```

Expected: `273 passed, 273 total`

- [ ] **Step 5: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add app/app/_layout.tsx app/package.json app/package-lock.json
git -C C:\Users\sylva\projects\training-app commit -m "feat(setup): @gorhom/bottom-sheet + GestureHandlerRootView"
```

---

## Task 2 — Migration v7 + types + repos

**Files:**
- Modify: `app/db/schema.ts`
- Modify: `app/db/types.ts`
- Modify: `app/repositories/IProgramRepository.ts`
- Modify: `app/repositories/SQLiteProgramRepository.ts`
- Modify: `app/repositories/InMemoryProgramRepository.ts`

- [ ] **Step 1: Migration v7 dans `app/db/schema.ts`**

À la fin du tableau `MIGRATIONS` (après la ligne `weight_ratio REAL`), ajouter :

```ts
  // v7 — template_id pour traçabilité des programmes importés
  `ALTER TABLE programs ADD COLUMN template_id TEXT;`,
```

- [ ] **Step 2: Ajouter `template_id` sur `Program` dans `app/db/types.ts`**

Modifier l'interface `Program` :

```ts
export interface Program {
  id: number;
  name: string;
  description: string | null;
  is_active: 0 | 1;
  created_at: string;
  template_id: string | null;
}
```

- [ ] **Step 3: Mettre à jour `CreateProgramDto` dans `app/repositories/IProgramRepository.ts`**

Rendre `template_id` optionnel pour ne pas casser le code existant :

```ts
import { Program } from '../db/types';

export type CreateProgramDto = Omit<Program, 'id' | 'created_at' | 'template_id'> & {
  template_id?: string | null;
};
export type UpdateProgramDto = Pick<Program, 'name' | 'description' | 'is_active'>;

export interface IProgramRepository {
  findAll(): Promise<Program[]>;
  findById(id: number): Promise<Program | null>;
  save(dto: CreateProgramDto): Promise<Program>;
  update(id: number, dto: UpdateProgramDto): Promise<Program>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 4: Mettre à jour `SQLiteProgramRepository.save()` dans `app/repositories/SQLiteProgramRepository.ts`**

Modifier uniquement la méthode `save()` :

```ts
async save(dto: CreateProgramDto): Promise<Program> {
  const result = await this.db.runAsync(
    `INSERT INTO programs (name, description, is_active, template_id) VALUES (?, ?, ?, ?)`,
    [dto.name, dto.description ?? null, dto.is_active, dto.template_id ?? null]
  );
  const saved = await this.findById(result.lastInsertRowId);
  if (!saved) throw new Error(`Programme ${result.lastInsertRowId} introuvable après insertion`);
  return saved;
}
```

- [ ] **Step 5: Mettre à jour `InMemoryProgramRepository.save()` dans `app/repositories/InMemoryProgramRepository.ts`**

Modifier uniquement la méthode `save()` :

```ts
async save(dto: CreateProgramDto): Promise<Program> {
  const program: Program = {
    ...dto,
    id: this.nextId++,
    created_at: new Date().toISOString(),
    template_id: dto.template_id ?? null,
  };
  this.programs.push(program);
  return program;
}
```

- [ ] **Step 6: Typecheck**

```bash
cd C:\Users\sylva\projects\training-app\app && npx tsc --noEmit 2>&1
```

Expected: 0 erreurs.

- [ ] **Step 7: Tests**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest --no-coverage 2>&1 | tail -5
```

Expected: `273 passed, 273 total`

- [ ] **Step 8: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add app/db/schema.ts app/db/types.ts app/repositories/IProgramRepository.ts app/repositories/SQLiteProgramRepository.ts app/repositories/InMemoryProgramRepository.ts
git -C C:\Users\sylva\projects\training-app commit -m "feat(db): migration v7 — template_id TEXT sur programs"
```

---

## Task 3 — Nouveaux exercices dans seeds.ts

**Files:**
- Modify: `app/db/seeds.ts`

- [ ] **Step 1: Ajouter 7 exercices dans `EXTRA_EXERCISES`**

Localiser `const EXTRA_EXERCISES: ExerciseDefinition[] = [` (ligne ~129) et ajouter à la fin du tableau, avant le `]` fermant :

```ts
  // ── Exercices templates ────────────────────────────────────────────────────
  {
    name: 'Soulevé de terre',
    type: 'musculation',
    muscle_groups: '["dos","jambes","lombaires"]',
    technical_notes: 'Dos plat, barre contre les tibias. Pousser le sol, ne pas tirer. Hanches et épaules montent ensemble.',
    description: 'Barre au sol, prise en pronation ou alternée. Pied à largeur de hanches. Garder la barre proche du corps sur toute la montée. Mouvement fondateur de la force.',
  },
  {
    name: 'Soulevé de terre jambes tendues',
    type: 'musculation',
    muscle_groups: '["ischio-jambiers","lombaires","fessiers"]',
    technical_notes: 'Jambes quasi tendues, dos plat. Descente contrôlée jusqu\'au milieu du tibia. Étirement des ischio-jambiers.',
    description: 'Barre ou haltères, descente avec le buste en gardant le dos plat. Idéal pour les ischio-jambiers et la chaîne postérieure. Ne pas arrondir le bas du dos.',
  },
  {
    name: 'Tirage poitrine',
    type: 'musculation',
    muscle_groups: '["dos","biceps","deltoïdes postérieurs"]',
    technical_notes: 'Prise large, tirer vers le haut de la poitrine. Coudes vers le bas et en arrière.',
    description: 'Machine ou poulie haute. Tirer la barre vers le sternum en serrant les omoplates. Dos légèrement arqué. Éviter de tirer derrière la nuque.',
  },
  {
    name: 'Skull crusher',
    type: 'musculation',
    muscle_groups: '["triceps"]',
    technical_notes: 'Coudes fixes, barre descend vers le front ou derrière la tête. Étirement profond des triceps.',
    description: 'Allongé sur un banc, barre EZ ou barre droite. Descente lente vers le front en gardant les coudes fixes. Extension explosive. Excellent pour la masse des triceps.',
  },
  {
    name: 'Oiseau haltères',
    type: 'musculation',
    muscle_groups: '["deltoïdes postérieurs","trapèzes","rhomboïdes"]',
    technical_notes: 'Buste penché à 45° ou 90°. Coudes légèrement fléchis, mouvement en arc. Cibler les deltoïdes postérieurs.',
    description: 'Assis penché en avant ou debout incliné. Élever les haltères latéralement en ciblant l\'arrière des épaules. Mouvement lent et contrôlé.',
  },
  {
    name: 'Élévations frontales',
    type: 'musculation',
    muscle_groups: '["deltoïdes antérieurs"]',
    technical_notes: 'Monter jusqu\'à hauteur des épaules ou légèrement au-dessus. Coudes quasi tendus. Pas d\'élan.',
    description: 'Haltères ou barre, bras tendus devant soi. Isolation de la partie antérieure de l\'épaule. Complémentaire aux élévations latérales.',
  },
  {
    name: 'Écarté couché haltères',
    type: 'musculation',
    muscle_groups: '["pectoraux","deltoïdes antérieurs"]',
    technical_notes: 'Coudes légèrement fléchis. Descente en arc large jusqu\'à étirement des pectoraux. Remonter en contractant.',
    description: 'Allongé sur un banc plat, haltères en main. Ouvrir les bras en arc pour étirer les pectoraux. Remonter sans verrouiller les coudes. Excellent pour l\'étirement et la contraction des pecs.',
  },
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\sylva\projects\training-app\app && npx tsc --noEmit 2>&1
```

Expected: 0 erreurs.

- [ ] **Step 3: Tests**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest --no-coverage 2>&1 | tail -5
```

Expected: `273 passed, 273 total`

- [ ] **Step 4: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add app/db/seeds.ts
git -C C:\Users\sylva\projects\training-app commit -m "feat(seeds): 7 nouveaux exercices pour les templates (SDT, Tirage poitrine, Skull crusher...)"
```

---

## Task 5 — TemplateService (TDD)

**Files:**
- Create: `app/services/TemplateService.test.ts`
- Create: `app/services/TemplateService.ts`

- [ ] **Step 1: Écrire les tests (fichier inexistant → tous échouent)**

Créer `app/services/TemplateService.test.ts` :

```ts
import { importTemplate, isTemplateImported } from './TemplateService';
import type { TemplateDefinition } from '../data/templates';
import type { Program } from '../db/types';
import { InMemoryProgramRepository } from '../repositories/InMemoryProgramRepository';
import { InMemoryWorkoutRepository } from '../repositories/InMemoryWorkoutRepository';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';
import { InMemoryBlockRepository } from '../repositories/InMemoryBlockRepository';
import { InMemorySetRepository } from '../repositories/InMemorySetRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

const TEST_TEMPLATE: TemplateDefinition = {
  id: 'test-template',
  name: 'Template Test',
  level: 'débutant',
  frequency: '3j/sem',
  description: 'Template de test',
  workouts: [
    {
      name: 'Séance A',
      exercises: [
        {
          exerciseName: 'Squat barre',
          blocks: [
            {
              name: 'Travail',
              is_work: true,
              sets: [
                { reps_min: 5, reps_max: 5, weight: null, weight_type: 'fixed', rest: 180 },
                { reps_min: 5, reps_max: 5, weight: null, weight_type: 'fixed', rest: 180 },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function makeRepos() {
  return {
    programRepo: new InMemoryProgramRepository(),
    workoutRepo: new InMemoryWorkoutRepository(),
    workoutExerciseRepo: new InMemoryWorkoutExerciseRepository(),
    blockRepo: new InMemoryBlockRepository(),
    setRepo: new InMemorySetRepository(),
    exerciseRepo: new InMemoryExerciseRepository(),
  };
}

async function seedSquat(exerciseRepo: InMemoryExerciseRepository) {
  return exerciseRepo.save({
    name: 'Squat barre',
    type: 'musculation',
    muscle_groups: '["jambes"]',
    technical_notes: null,
    description: null,
    is_custom: 0,
    progression_step: 2.0,
    progression_threshold: 1,
  });
}

describe('importTemplate', () => {
  it('crée un programme avec le template_id et le nom fournis', async () => {
    const repos = makeRepos();
    await seedSquat(repos.exerciseRepo);

    const programId = await importTemplate(
      TEST_TEMPLATE, 'Mon 5x5',
      repos.programRepo, repos.workoutRepo, repos.workoutExerciseRepo,
      repos.blockRepo, repos.setRepo, repos.exerciseRepo,
    );

    const programs = await repos.programRepo.findAll();
    expect(programs).toHaveLength(1);
    expect(programs[0].id).toBe(programId);
    expect(programs[0].name).toBe('Mon 5x5');
    expect(programs[0].template_id).toBe('test-template');
    expect(programs[0].is_active).toBe(0);
  });

  it('crée les workouts du template', async () => {
    const repos = makeRepos();
    await seedSquat(repos.exerciseRepo);

    const programId = await importTemplate(
      TEST_TEMPLATE, 'Test',
      repos.programRepo, repos.workoutRepo, repos.workoutExerciseRepo,
      repos.blockRepo, repos.setRepo, repos.exerciseRepo,
    );

    const workouts = await repos.workoutRepo.findByProgramId(programId);
    expect(workouts).toHaveLength(1);
    expect(workouts[0].name).toBe('Séance A');
    expect(workouts[0].order_index).toBe(0);
  });

  it('crée les sets avec les bonnes valeurs', async () => {
    const repos = makeRepos();
    const exercise = await seedSquat(repos.exerciseRepo);

    const programId = await importTemplate(
      TEST_TEMPLATE, 'Test',
      repos.programRepo, repos.workoutRepo, repos.workoutExerciseRepo,
      repos.blockRepo, repos.setRepo, repos.exerciseRepo,
    );

    const workouts = await repos.workoutRepo.findByProgramId(programId);
    const wes = await repos.workoutExerciseRepo.findByWorkoutId(workouts[0].id);
    expect(wes[0].exercise_id).toBe(exercise.id);
    const blocks = await repos.blockRepo.findByWorkoutExerciseId(wes[0].id);
    expect(blocks[0].name).toBe('Travail');
    expect(blocks[0].is_work_block).toBe(1);
    const sets = await repos.setRepo.findByBlockId(blocks[0].id);
    expect(sets).toHaveLength(2);
    expect(sets[0].reps_min).toBe(5);
    expect(sets[0].rest_duration).toBe(180);
  });

  it('throw si un exercice est introuvable', async () => {
    const repos = makeRepos();
    // exerciseRepo vide — pas de Squat barre

    await expect(
      importTemplate(
        TEST_TEMPLATE, 'Test',
        repos.programRepo, repos.workoutRepo, repos.workoutExerciseRepo,
        repos.blockRepo, repos.setRepo, repos.exerciseRepo,
      )
    ).rejects.toThrow('Exercice introuvable: "Squat barre"');
  });
});

describe('isTemplateImported', () => {
  it('retourne false si aucun programme', () => {
    expect(isTemplateImported([], 'full-body-3j')).toBe(false);
  });

  it('retourne true si un programme a le template_id correspondant', () => {
    const programs: Program[] = [
      { id: 1, name: 'Full Body 3j', description: null, is_active: 0, template_id: 'full-body-3j', created_at: '2026-01-01' },
    ];
    expect(isTemplateImported(programs, 'full-body-3j')).toBe(true);
  });

  it('retourne false si aucun programme ne correspond', () => {
    const programs: Program[] = [
      { id: 1, name: 'PPL', description: null, is_active: 1, template_id: null, created_at: '2026-01-01' },
    ];
    expect(isTemplateImported(programs, 'full-body-3j')).toBe(false);
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest TemplateService --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module './TemplateService'`

- [ ] **Step 3: Créer `app/services/TemplateService.ts`**

```ts
import type { TemplateDefinition } from '../data/templates';
import type { Program } from '../db/types';
import type { IProgramRepository } from '../repositories/IProgramRepository';
import type { IWorkoutRepository } from '../repositories/IWorkoutRepository';
import type { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import type { IBlockRepository } from '../repositories/IBlockRepository';
import type { ISetRepository } from '../repositories/ISetRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';

export function isTemplateImported(programs: Program[], templateId: string): boolean {
  return programs.some(p => p.template_id === templateId);
}

export async function importTemplate(
  template: TemplateDefinition,
  programName: string,
  programRepo: IProgramRepository,
  workoutRepo: IWorkoutRepository,
  workoutExerciseRepo: IWorkoutExerciseRepository,
  blockRepo: IBlockRepository,
  setRepo: ISetRepository,
  exerciseRepo: IExerciseRepository,
): Promise<number> {
  const exercises = await exerciseRepo.findAll();
  const exerciseMap = new Map(exercises.map(e => [e.name, e.id]));

  for (const workout of template.workouts) {
    for (const ex of workout.exercises) {
      if (!exerciseMap.has(ex.exerciseName)) {
        throw new Error(`Exercice introuvable: "${ex.exerciseName}"`);
      }
    }
  }

  const program = await programRepo.save({
    name: programName,
    description: null,
    is_active: 0,
    template_id: template.id,
  });

  for (let wi = 0; wi < template.workouts.length; wi++) {
    const wt = template.workouts[wi];
    const workout = await workoutRepo.save({ program_id: program.id, name: wt.name, order_index: wi });

    for (let ei = 0; ei < wt.exercises.length; ei++) {
      const et = wt.exercises[ei];
      const exerciseId = exerciseMap.get(et.exerciseName)!;
      const we = await workoutExerciseRepo.save({ workout_id: workout.id, exercise_id: exerciseId, order_index: ei });

      for (let bi = 0; bi < et.blocks.length; bi++) {
        const bt = et.blocks[bi];
        const block = await blockRepo.save({
          workout_exercise_id: we.id,
          name: bt.name,
          order_index: bi,
          is_work_block: bt.is_work ? 1 : 0,
        });

        for (let si = 0; si < bt.sets.length; si++) {
          const st = bt.sets[si];
          await setRepo.save({
            block_id: block.id,
            reps_min: st.reps_min,
            reps_max: st.reps_max,
            weight: st.weight,
            weight_type: st.weight_type,
            rest_duration: st.rest,
            order_index: si,
            duration_seconds: st.duration_seconds ?? null,
            weight_ratio: st.weight_ratio ?? null,
          });
        }
      }
    }
  }

  return program.id;
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest TemplateService --no-coverage 2>&1 | tail -10
```

Expected: `7 passed, 7 total`

- [ ] **Step 5: Typecheck**

```bash
cd C:\Users\sylva\projects\training-app\app && npx tsc --noEmit 2>&1
```

Expected: 0 erreurs.

- [ ] **Step 6: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add app/services/TemplateService.ts app/services/TemplateService.test.ts
git -C C:\Users\sylva\projects\training-app commit -m "feat(services): TemplateService — importTemplate + isTemplateImported"
```

---

## Task 4 — Définitions des 5 templates

**Files:**
- Create: `app/data/templates.ts`

- [ ] **Step 1: Créer `app/data/templates.ts`**

```ts
import type { WeightType } from '../db/types';

type SetTemplate = {
  reps_min: number;
  reps_max: number;
  weight: number | null;
  weight_type: WeightType;
  rest: number;
  duration_seconds?: number | null;
  weight_ratio?: number | null;
};

type BlockTemplate = {
  name: string;
  is_work: boolean;
  sets: SetTemplate[];
};

export type ExerciseTemplate = {
  exerciseName: string;
  blocks: BlockTemplate[];
};

export type WorkoutTemplate = {
  name: string;
  exercises: ExerciseTemplate[];
};

export type TemplateDefinition = {
  id: string;
  name: string;
  level: 'débutant' | 'intermédiaire' | 'avancé';
  frequency: string;
  description: string;
  workouts: WorkoutTemplate[];
};

function s(reps_min: number, reps_max: number, rest: number): SetTemplate {
  return { reps_min, reps_max, weight: null, weight_type: 'fixed', rest };
}

function repeat(n: number, set: SetTemplate): SetTemplate[] {
  return Array.from({ length: n }, () => ({ ...set }));
}

function work(exerciseName: string, n: number, reps_min: number, reps_max: number, rest: number): ExerciseTemplate {
  return {
    exerciseName,
    blocks: [{ name: 'Travail', is_work: true, sets: repeat(n, s(reps_min, reps_max, rest)) }],
  };
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: '5x5-stronglifts',
    name: '5×5 Stronglifts',
    level: 'débutant',
    frequency: '3j/sem',
    description: 'Force pure sur les 5 grands mouvements. Alternance séance A / séance B.',
    workouts: [
      {
        name: 'Séance A',
        exercises: [
          work('Squat barre', 5, 5, 5, 180),
          work('Développé couché barre', 5, 5, 5, 180),
          work('Rowing barre', 5, 5, 5, 180),
        ],
      },
      {
        name: 'Séance B',
        exercises: [
          work('Squat barre', 5, 5, 5, 180),
          work('Développé militaire barre', 5, 5, 5, 180),
          work('Soulevé de terre', 1, 5, 5, 240),
        ],
      },
    ],
  },
  {
    id: 'full-body-3j',
    name: 'Full Body 3j',
    level: 'débutant',
    frequency: '3j/sem',
    description: 'Séance unique répétée 3× par semaine. Tous les muscles à chaque séance.',
    workouts: [
      {
        name: 'Full Body',
        exercises: [
          work('Squat barre', 3, 8, 10, 120),
          work('Développé couché barre', 3, 8, 10, 120),
          work('Rowing barre', 3, 8, 10, 120),
          work('Développé militaire barre', 3, 8, 10, 90),
          work('Soulevé de terre', 3, 6, 8, 150),
          work('Tractions lestées', 3, 5, 8, 120),
        ],
      },
    ],
  },
  {
    id: 'upper-lower-4j',
    name: 'Upper / Lower 4j',
    level: 'intermédiaire',
    frequency: '4j/sem',
    description: '2 séances haut du corps, 2 séances bas. Alternance force / hypertrophie.',
    workouts: [
      {
        name: 'Haut A — Force',
        exercises: [
          work('Développé couché barre', 4, 4, 6, 180),
          work('Rowing barre', 4, 4, 6, 180),
          work('Développé militaire barre', 3, 4, 6, 150),
          work('Tractions lestées', 3, 4, 6, 150),
          work('Curl biceps barre', 3, 8, 10, 90),
          work('Dips', 3, 6, 8, 90),
        ],
      },
      {
        name: 'Bas A — Force',
        exercises: [
          work('Squat barre', 4, 4, 6, 180),
          work('Soulevé de terre', 3, 4, 6, 180),
          work('Presse à cuisses', 3, 8, 10, 120),
          work('Leg curl couché', 3, 8, 10, 90),
        ],
      },
      {
        name: 'Haut B — Hypertrophie',
        exercises: [
          work('Développé incliné haltères', 4, 8, 12, 90),
          work('Tirage poitrine', 4, 8, 12, 90),
          work('Élévations latérales', 3, 12, 15, 60),
          work('Curl marteau haltères', 3, 10, 12, 60),
          work('Dips', 3, 8, 12, 90),
          work('Face pull', 3, 12, 15, 60),
        ],
      },
      {
        name: 'Bas B — Hypertrophie',
        exercises: [
          work('Squat barre', 4, 8, 12, 120),
          work('Soulevé de terre jambes tendues', 3, 10, 12, 90),
          work('Presse à cuisses', 3, 12, 15, 90),
          work('Extensions quadriceps', 3, 12, 15, 60),
          work('Leg curl couché', 3, 12, 15, 60),
          work('Mollets debout', 4, 15, 20, 60),
        ],
      },
    ],
  },
  {
    id: 'bro-split-5j',
    name: 'Bro Split 5j',
    level: 'intermédiaire',
    frequency: '5j/sem',
    description: 'Une séance par groupe musculaire. Classique hypertrophie.',
    workouts: [
      {
        name: 'Pectoraux',
        exercises: [
          work('Développé couché barre', 4, 8, 10, 120),
          work('Développé incliné haltères', 3, 10, 12, 90),
          work('Dips', 3, 10, 12, 90),
          work('Écarté couché haltères', 3, 12, 15, 60),
        ],
      },
      {
        name: 'Dos',
        exercises: [
          work('Soulevé de terre', 3, 6, 8, 180),
          work('Tractions lestées', 4, 6, 8, 120),
          work('Rowing barre', 4, 8, 10, 120),
          work('Tirage poitrine', 3, 10, 12, 90),
        ],
      },
      {
        name: 'Épaules',
        exercises: [
          work('Développé militaire barre', 4, 8, 10, 120),
          work('Élévations latérales', 3, 12, 15, 60),
          work('Élévations frontales', 3, 12, 15, 60),
          work('Oiseau haltères', 3, 12, 15, 60),
        ],
      },
      {
        name: 'Bras',
        exercises: [
          work('Curl biceps barre', 4, 8, 10, 90),
          work('Curl marteau haltères', 3, 10, 12, 90),
          work('Skull crusher', 4, 8, 10, 90),
          work('Dips', 3, 10, 12, 90),
        ],
      },
      {
        name: 'Jambes',
        exercises: [
          work('Squat barre', 4, 8, 10, 120),
          work('Soulevé de terre jambes tendues', 3, 10, 12, 90),
          work('Presse à cuisses', 3, 12, 15, 90),
          work('Extensions quadriceps', 3, 12, 15, 60),
          work('Leg curl couché', 3, 12, 15, 60),
          work('Mollets debout', 4, 15, 20, 60),
        ],
      },
    ],
  },
  {
    id: 'arnold-split-6j',
    name: 'Arnold Split 6j',
    level: 'avancé',
    frequency: '6j/sem',
    description: '3 séances répétées 2× par semaine. Technique classique d\'Arnold Schwarzenegger.',
    workouts: [
      {
        name: 'Pectoraux + Dos',
        exercises: [
          work('Développé couché barre', 4, 6, 8, 150),
          work('Tractions lestées', 4, 6, 8, 150),
          work('Développé incliné haltères', 3, 8, 10, 90),
          work('Rowing barre', 3, 8, 10, 90),
          work('Écarté couché haltères', 3, 10, 12, 60),
          work('Tirage poitrine', 3, 10, 12, 60),
        ],
      },
      {
        name: 'Épaules + Bras',
        exercises: [
          work('Développé militaire barre', 4, 6, 8, 150),
          work('Curl biceps barre', 4, 8, 10, 90),
          work('Élévations latérales', 3, 10, 12, 60),
          work('Skull crusher', 3, 8, 10, 90),
          work('Oiseau haltères', 3, 12, 15, 60),
          work('Curl marteau haltères', 3, 10, 12, 60),
        ],
      },
      {
        name: 'Jambes',
        exercises: [
          work('Squat barre', 4, 6, 8, 150),
          work('Soulevé de terre jambes tendues', 3, 8, 10, 90),
          work('Presse à cuisses', 3, 10, 12, 90),
          work('Extensions quadriceps', 3, 12, 15, 60),
          work('Leg curl couché', 3, 12, 15, 60),
          work('Mollets debout', 4, 15, 20, 60),
        ],
      },
    ],
  },
];
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\sylva\projects\training-app\app && npx tsc --noEmit 2>&1
```

Expected: 0 erreurs.

- [ ] **Step 3: Tests**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest --no-coverage 2>&1 | tail -5
```

Expected: `273 passed, 273 total`

- [ ] **Step 4: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add app/data/templates.ts
git -C C:\Users\sylva\projects\training-app commit -m "feat(data): 5 templates — Stronglifts 5x5, Full Body, Upper/Lower, Bro Split, Arnold Split"
```

---

## Task 6 — AddProgrammeBottomSheet

**Files:**
- Create: `app/components/programmes/AddProgrammeBottomSheet.tsx`

- [ ] **Step 1: Créer `app/components/programmes/AddProgrammeBottomSheet.tsx`**

```tsx
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useRef, useCallback, useMemo, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface AddProgrammeBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onCreateBlank: () => void;
  onImportTemplate: () => void;
}

export function AddProgrammeBottomSheet({
  isVisible,
  onClose,
  onCreateBlank,
  onImportTemplate,
}: AddProgrammeBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['35%'], []);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  const renderBackdrop = useCallback(
    (props: object) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        onPress={onClose}
      />
    ),
    [onClose],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={styles.container}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => { onClose(); onCreateBlank(); }}
          accessibilityLabel="Créer un programme vide"
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="add-circle-outline" size={22} color={colors.text} />
          </View>
          <Text style={[styles.optionText, { color: colors.text }]}>Créer un programme vide</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.option}
          onPress={() => { onClose(); onImportTemplate(); }}
          accessibilityLabel="Importer un template"
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="download-outline" size={22} color={colors.text} />
          </View>
          <Text style={[styles.optionText, { color: colors.text }]}>Importer un template</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    minHeight: 44,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\sylva\projects\training-app\app && npx tsc --noEmit 2>&1
```

Expected: 0 erreurs.

- [ ] **Step 3: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add "app/components/programmes/AddProgrammeBottomSheet.tsx"
git -C C:\Users\sylva\projects\training-app commit -m "feat(ui): AddProgrammeBottomSheet — 2 choix via @gorhom/bottom-sheet"
```

---

## Task 7 — Import template screen + route

**Files:**
- Create: `app/app/import-template.tsx`
- Modify: `app/app/_layout.tsx`

- [ ] **Step 1: Créer `app/app/import-template.tsx`**

```tsx
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { usePrograms } from '@/hooks/usePrograms';
import { TEMPLATES } from '@/data/templates';
import type { TemplateDefinition } from '@/data/templates';
import { importTemplate, isTemplateImported } from '@/services/TemplateService';
import { getDb } from '@/db';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';

const SUBMIT_TEXT_COLOR = '#fff' as const;
const WARNING_COLOR = '#f59e0b' as const;

const LEVEL_LABELS = {
  débutant: 'Débutant',
  intermédiaire: 'Intermédiaire',
  avancé: 'Avancé',
} as const;

export default function ImportTemplateModal() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { programs } = usePrograms();

  const [selected, setSelected] = useState<TemplateDefinition | null>(null);
  const [programName, setProgramName] = useState('');
  const [importing, setImporting] = useState(false);

  const alreadyImported = selected ? isTemplateImported(programs, selected.id) : false;
  const canImport = selected !== null && programName.trim().length > 0 && !importing;

  function handleSelect(template: TemplateDefinition) {
    setSelected(template);
    setProgramName(template.name);
  }

  async function handleImport() {
    if (!selected || !programName.trim()) return;
    setImporting(true);
    try {
      const db = getDb();
      await importTemplate(
        selected,
        programName.trim(),
        new SQLiteProgramRepository(db),
        new SQLiteWorkoutRepository(db),
        new SQLiteWorkoutExerciseRepository(db),
        new SQLiteBlockRepository(db),
        new SQLiteSetRepository(db),
        new SQLiteExerciseRepository(db),
      );
      router.back();
    } catch (e) {
      Alert.alert('Erreur', String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Choisir un programme
        </Text>
        {TEMPLATES.map(template => {
          const isSelected = selected?.id === template.id;
          return (
            <PressableA11y
              key={template.id}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.border },
                isSelected && styles.cardSelected,
              ]}
              onPress={() => handleSelect(template)}
              accessibilityLabel={`Template ${template.name}, ${template.level}, ${template.frequency}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.cardRow}>
                <Text style={[styles.cardName, { color: colors.text }]}>{template.name}</Text>
                <Text style={[styles.cardFreq, { color: colors.textSecondary }]}>{template.frequency}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={[styles.cardLevel, { color: colors.textSecondary }]}>
                  {LEVEL_LABELS[template.level]}
                </Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                  {template.workouts.length} séance{template.workouts.length > 1 ? 's' : ''}
                </Text>
              </View>
            </PressableA11y>
          );
        })}

        {selected !== null && (
          <View style={styles.importSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Nom du programme
            </Text>
            {alreadyImported && (
              <View style={[styles.warning, { borderColor: WARNING_COLOR }]}>
                <Text style={[styles.warningText, { color: WARNING_COLOR }]}>
                  Ce template a déjà été importé. Tu peux donner un nom différent pour mieux t'y retrouver.
                </Text>
              </View>
            )}
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={programName}
              onChangeText={setProgramName}
              placeholder="Nom du programme"
              placeholderTextColor={colors.textDisabled}
              accessibilityLabel="Nom du programme"
              returnKeyType="done"
            />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <PressableA11y
          style={[
            styles.submitBtn,
            { backgroundColor: canImport ? colors.primary : colors.surfaceElevated },
          ]}
          onPress={handleImport}
          disabled={!canImport}
          accessibilityLabel="Importer le programme"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canImport }}
        >
          {importing ? (
            <ActivityIndicator color={SUBMIT_TEXT_COLOR} />
          ) : (
            <Text style={[styles.submitText, { color: canImport ? SUBMIT_TEXT_COLOR : colors.textDisabled }]}>
              Importer
            </Text>
          )}
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 24, gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 8 },
  card: {
    padding: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
    gap: 4,
    minHeight: 44,
  },
  cardSelected: { borderWidth: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 15, fontWeight: '600' },
  cardFreq: { fontSize: 13 },
  cardLevel: { fontSize: 12 },
  cardDesc: { fontSize: 12 },
  importSection: { marginTop: 16, gap: 8 },
  warning: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: 12,
  },
  warningText: { fontSize: 13, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 44,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitBtn: {
    height: 50,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 2: Ajouter la route dans `app/app/_layout.tsx`**

Dans `RootLayoutNav`, ajouter après la route `add-programme` :

```tsx
<Stack.Screen
  name="import-template"
  options={{ presentation: 'modal', title: 'Importer un template' }}
/>
```

- [ ] **Step 3: Typecheck**

```bash
cd C:\Users\sylva\projects\training-app\app && npx tsc --noEmit 2>&1
```

Expected: 0 erreurs.

- [ ] **Step 4: Tests**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest --no-coverage 2>&1 | tail -5
```

Expected: `280 passed, 280 total`

- [ ] **Step 5: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add app/app/import-template.tsx app/app/_layout.tsx
git -C C:\Users\sylva\projects\training-app commit -m "feat(ui): écran import template — liste + nom personnalisable + warning doublon"
```

---

## Task 8 — Câbler programmes.tsx

**Files:**
- Modify: `app/app/(tabs)/programmes.tsx`

- [ ] **Step 1: Lire `app/app/(tabs)/programmes.tsx`**

Vérifier la ligne `onPress={() => router.push('/add-programme')}` du FAB (ligne ~116) — c'est celle à remplacer.

- [ ] **Step 2: Modifier `app/app/(tabs)/programmes.tsx`**

Remplacer le fichier entier par :

```tsx
import { FlatList, View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { usePrograms } from '@/hooks/usePrograms';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { ProgramCard } from '@/components/programmes/ProgramCard';
import { AddProgrammeBottomSheet } from '@/components/programmes/AddProgrammeBottomSheet';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { Program } from '@/db/types';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { getDb } from '@/db';

const FAB_ICON_COLOR = '#fff' as const;
const SHADOW_COLOR = '#000' as const;

export default function ProgrammesScreen() {
  const { programs, loading, error, remove, setActive, refresh } = usePrograms();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [workoutCounts, setWorkoutCounts] = useState<Record<number, number>>({});
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  useEffect(() => {
    if (programs.length === 0) return;
    const repo = new SQLiteWorkoutRepository(getDb());
    Promise.all(programs.map(p => repo.findByProgramId(p.id).then(ws => [p.id, ws.length] as [number, number])))
      .then(entries => setWorkoutCounts(Object.fromEntries(entries)))
      .catch(() => {});
  }, [programs]);

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  function handleLongPress(program: Program) {
    const buttons: Parameters<typeof Alert.alert>[2] = [
      {
        text: 'Modifier',
        onPress: () => router.push({ pathname: '/add-programme', params: { id: String(program.id) } }),
      },
    ];
    if (program.is_active !== 1) {
      buttons.push({ text: 'Activer', onPress: () => setActive(program.id) });
    }
    buttons.push(
      { text: 'Supprimer', style: 'destructive', onPress: () => confirmDelete(program) },
      { text: 'Annuler', style: 'cancel' },
    );
    Alert.alert(program.name, 'Que veux-tu faire ?', buttons);
  }

  function confirmDelete(program: Program) {
    Alert.alert(
      'Supprimer le programme',
      `Supprimer "${program.name}" et toutes ses séances ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => remove(program.id),
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={programs}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProgramCard
            program={item}
            workoutCount={workoutCounts[item.id] ?? 0}
            onPress={() => router.push({ pathname: '/programme/[id]', params: { id: String(item.id) } })}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Aucun programme. Appuie sur + pour en créer un.
          </Text>
        }
      />
      <PressableA11y
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setBottomSheetOpen(true)}
        accessibilityLabel="Ajouter un programme"
      >
        <Ionicons name="add" size={28} color={FAB_ICON_COLOR} />
      </PressableA11y>
      <AddProgrammeBottomSheet
        isVisible={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        onCreateBlank={() => router.push('/add-programme')}
        onImportTemplate={() => router.push('/import-template')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 15 },
  errorText: { fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
```

- [ ] **Step 3: Typecheck**

```bash
cd C:\Users\sylva\projects\training-app\app && npx tsc --noEmit 2>&1
```

Expected: 0 erreurs.

- [ ] **Step 4: Tests**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest --no-coverage 2>&1 | tail -5
```

Expected: `280 passed, 280 total`

- [ ] **Step 5: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add "app/app/(tabs)/programmes.tsx"
git -C C:\Users\sylva\projects\training-app commit -m "feat(programmes): FAB → BottomSheet — Créer vide / Importer template"
```
