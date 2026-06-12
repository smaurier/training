import type { WeightType } from '../db/types';

type SetTemplate = {
  reps_min: number;
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

function s(reps_min: number, rest: number): SetTemplate {
  return { reps_min, weight: null, weight_type: 'fixed', rest };
}

function repeat(n: number, set: SetTemplate): SetTemplate[] {
  return Array.from({ length: n }, () => ({ ...set }));
}

function work(exerciseName: string, n: number, reps_min: number, rest: number): ExerciseTemplate {
  return {
    exerciseName,
    blocks: [{ name: 'Travail', is_work: true, sets: repeat(n, s(reps_min, rest)) }],
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
          work('Squat barre', 5, 5, 180),
          work('Développé couché barre', 5, 5, 180),
          work('Rowing barre', 5, 5, 180),
        ],
      },
      {
        name: 'Séance B',
        exercises: [
          work('Squat barre', 5, 5, 180),
          work('Développé militaire barre', 5, 5, 180),
          work('Soulevé de terre', 1, 5, 240),
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
          work('Squat barre', 3, 8, 120),
          work('Développé couché barre', 3, 8, 120),
          work('Rowing barre', 3, 8, 120),
          work('Développé militaire barre', 3, 8, 90),
          work('Soulevé de terre', 3, 6, 150),
          work('Tractions lestées', 3, 5, 120),
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
          work('Développé couché barre', 4, 4, 180),
          work('Rowing barre', 4, 4, 180),
          work('Développé militaire barre', 3, 4, 150),
          work('Tractions lestées', 3, 4, 150),
          work('Curl biceps barre', 3, 8, 90),
          work('Dips', 3, 6, 90),
        ],
      },
      {
        name: 'Bas A — Force',
        exercises: [
          work('Squat barre', 4, 4, 180),
          work('Soulevé de terre', 3, 4, 180),
          work('Presse à cuisses', 3, 8, 120),
          work('Leg curl couché', 3, 8, 90),
        ],
      },
      {
        name: 'Haut B — Hypertrophie',
        exercises: [
          work('Développé incliné haltères', 4, 8, 90),
          work('Tirage poitrine', 4, 8, 90),
          work('Élévations latérales', 3, 12, 60),
          work('Curl marteau haltères', 3, 10, 60),
          work('Dips', 3, 8, 90),
          work('Face pull', 3, 12, 60),
        ],
      },
      {
        name: 'Bas B — Hypertrophie',
        exercises: [
          work('Squat barre', 4, 8, 120),
          work('Soulevé de terre jambes tendues', 3, 10, 90),
          work('Presse à cuisses', 3, 12, 90),
          work('Extensions quadriceps', 3, 12, 60),
          work('Leg curl couché', 3, 12, 60),
          work('Mollets debout', 4, 15, 60),
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
          work('Développé couché barre', 4, 8, 120),
          work('Développé incliné haltères', 3, 10, 90),
          work('Dips', 3, 10, 90),
          work('Écarté couché haltères', 3, 12, 60),
        ],
      },
      {
        name: 'Dos',
        exercises: [
          work('Soulevé de terre', 3, 6, 180),
          work('Tractions lestées', 4, 6, 120),
          work('Rowing barre', 4, 8, 120),
          work('Tirage poitrine', 3, 10, 90),
        ],
      },
      {
        name: 'Épaules',
        exercises: [
          work('Développé militaire barre', 4, 8, 120),
          work('Élévations latérales', 3, 12, 60),
          work('Élévations frontales', 3, 12, 60),
          work('Oiseau haltères', 3, 12, 60),
        ],
      },
      {
        name: 'Bras',
        exercises: [
          work('Curl biceps barre', 4, 8, 90),
          work('Curl marteau haltères', 3, 10, 90),
          work('Skull crusher', 4, 8, 90),
          work('Dips', 3, 10, 90),
        ],
      },
      {
        name: 'Jambes',
        exercises: [
          work('Squat barre', 4, 8, 120),
          work('Soulevé de terre jambes tendues', 3, 10, 90),
          work('Presse à cuisses', 3, 12, 90),
          work('Extensions quadriceps', 3, 12, 60),
          work('Leg curl couché', 3, 12, 60),
          work('Mollets debout', 4, 15, 60),
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
          work('Développé couché barre', 4, 6, 150),
          work('Tractions lestées', 4, 6, 150),
          work('Développé incliné haltères', 3, 8, 90),
          work('Rowing barre', 3, 8, 90),
          work('Écarté couché haltères', 3, 10, 60),
          work('Tirage poitrine', 3, 10, 60),
        ],
      },
      {
        name: 'Épaules + Bras',
        exercises: [
          work('Développé militaire barre', 4, 6, 150),
          work('Curl biceps barre', 4, 8, 90),
          work('Élévations latérales', 3, 10, 60),
          work('Skull crusher', 3, 8, 90),
          work('Oiseau haltères', 3, 12, 60),
          work('Curl marteau haltères', 3, 10, 60),
        ],
      },
      {
        name: 'Jambes',
        exercises: [
          work('Squat barre', 4, 6, 150),
          work('Soulevé de terre jambes tendues', 3, 8, 90),
          work('Presse à cuisses', 3, 10, 90),
          work('Extensions quadriceps', 3, 12, 60),
          work('Leg curl couché', 3, 12, 60),
          work('Mollets debout', 4, 15, 60),
        ],
      },
    ],
  },
];
