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
