import type { SQLiteDatabase } from 'expo-sqlite';

const BASE_EXERCISES = [
  // Poitrine
  {
    name: 'Développé couché barre',
    type: 'musculation',
    muscle_groups: '["pectoraux","triceps","deltoïdes antérieurs"]',
    technical_notes: 'Omoplates serrées, poitrine sortie. Coudes à 45–60° du buste. Barre descend bas des pecs, descente 2–3 secondes.',
  },
  {
    name: 'Développé incliné haltères',
    type: 'musculation',
    muscle_groups: '["pectoraux supérieurs","triceps","deltoïdes antérieurs"]',
    technical_notes: 'Inclinaison 30–45°. Rotation des poignets en fin de mouvement.',
  },
  {
    name: 'Écarté haltères',
    type: 'musculation',
    muscle_groups: '["pectoraux","deltoïdes antérieurs"]',
    technical_notes: 'Légère flexion des coudes tout au long du mouvement. Amplitude complète.',
  },
  // Dos
  {
    name: 'Soulevé de terre',
    type: 'musculation',
    muscle_groups: '["ischio-jambiers","fessiers","érecteurs du rachis","trapèzes"]',
    technical_notes: 'Dos droit, barre proche du corps. Hanches et épaules montent ensemble. Bracing abdominal.',
  },
  {
    name: 'Tractions',
    type: 'musculation',
    muscle_groups: '["grand dorsal","biceps","rhomboïdes"]',
    technical_notes: 'Prise pronation ou supination. Omoplates en rétraction en bas. Menton au-dessus de la barre.',
  },
  {
    name: 'Rowing barre',
    type: 'musculation',
    muscle_groups: '["grand dorsal","rhomboïdes","biceps","trapèzes"]',
    technical_notes: 'Dos à 45°. Barre tirée vers le nombril. Coudes proches du corps.',
  },
  {
    name: 'Tirage vertical poulie',
    type: 'musculation',
    muscle_groups: '["grand dorsal","biceps","rhomboïdes"]',
    technical_notes: 'Prise large pronation. Barre tirée vers le sternum. Omoplate en rétraction.',
  },
  // Épaules
  {
    name: 'Développé militaire barre',
    type: 'musculation',
    muscle_groups: '["deltoïdes","triceps","trapèzes"]',
    technical_notes: 'Debout ou assis. Gainage abdominal. Barre descend au niveau du menton.',
  },
  {
    name: 'Élévations latérales haltères',
    type: 'musculation',
    muscle_groups: '["deltoïdes latéraux"]',
    technical_notes: 'Légère flexion des coudes. Élévation jusqu\'à hauteur des épaules maximum. Mouvement contrôlé.',
  },
  // Jambes
  {
    name: 'Squat barre',
    type: 'musculation',
    muscle_groups: '["quadriceps","fessiers","ischio-jambiers"]',
    technical_notes: 'Pieds légèrement tournés. Descente jusqu\'aux cuisses parallèles. Genoux dans l\'axe des pieds. Dos droit.',
  },
  {
    name: 'Presse à cuisses',
    type: 'musculation',
    muscle_groups: '["quadriceps","fessiers","ischio-jambiers"]',
    technical_notes: 'Placement des pieds détermine le muscle ciblé. Ne pas verrouiller les genoux en fin de mouvement.',
  },
  {
    name: 'Hip thrust',
    type: 'musculation',
    muscle_groups: '["fessiers","ischio-jambiers"]',
    technical_notes: 'Épaules sur le banc. Contraction maximale des fessiers en haut. Barre sur les hanches.',
  },
  {
    name: 'Leg curl couché',
    type: 'musculation',
    muscle_groups: '["ischio-jambiers"]',
    technical_notes: 'Contraction maximale en fin de mouvement. Descente lente et contrôlée.',
  },
  // Bras
  {
    name: 'Curl biceps haltères',
    type: 'musculation',
    muscle_groups: '["biceps","brachial"]',
    technical_notes: 'Coudes fixes contre le buste. Supination complète en fin de mouvement.',
  },
  {
    name: 'Extension triceps poulie haute',
    type: 'musculation',
    muscle_groups: '["triceps"]',
    technical_notes: 'Coudes fixes. Extension complète. Contraction en fin de mouvement.',
  },
  {
    name: 'Dips',
    type: 'musculation',
    muscle_groups: '["triceps","pectoraux","deltoïdes antérieurs"]',
    technical_notes: 'Corps légèrement incliné vers l\'avant pour cibler les pecs. Descente jusqu\'à 90° aux coudes.',
  },
  // Abdos
  {
    name: 'Crunch',
    type: 'musculation',
    muscle_groups: '["abdominaux"]',
    technical_notes: 'Contraction des abdos pour initier le mouvement. Pas de traction sur la nuque.',
  },
  {
    name: 'Gainage planche',
    type: 'musculation',
    muscle_groups: '["abdominaux","fessiers","érecteurs du rachis"]',
    technical_notes: 'Corps aligné tête-talons. Pas de compensation avec les hanches.',
  },
];

// Exercices manquants pour le programme PPL
const EXTRA_EXERCISES = [
  {
    name: 'Crunch poulie haute',
    type: 'musculation',
    muscle_groups: '["abdominaux"]',
    technical_notes: 'Corde à la poulie haute. Enrouler le bassin vers le bas, ne pas tirer uniquement avec les bras.',
  },
  {
    name: 'Face pull',
    type: 'musculation',
    muscle_groups: '["deltoïdes postérieurs","trapèzes","rotateurs externes"]',
    technical_notes: 'Corde à la poulie haute, coudes hauts et en arrière. Tirer vers le visage. Compense le travail de poussée.',
  },
  {
    name: 'Curl barre EZ',
    type: 'musculation',
    muscle_groups: '["biceps","brachial"]',
    technical_notes: 'Prise semi-supinée sur la barre EZ. Coudes fixes contre le buste. Amplitude complète.',
  },
  {
    name: 'Tirage poulie basse',
    type: 'musculation',
    muscle_groups: '["grand dorsal","rhomboïdes","biceps"]',
    technical_notes: 'Assis face à la poulie basse. Tirer vers le nombril, coudes proches du corps. Contraction maximale en fin de mouvement.',
  },
  {
    name: 'Relevés de jambes suspendu',
    type: 'musculation',
    muscle_groups: '["abdominaux","fléchisseurs de hanche"]',
    technical_notes: 'Suspendu à une barre. Lever les jambes en basculant le bassin vers le haut. Contrôler la descente.',
  },
  {
    name: 'Romanian Deadlift',
    type: 'musculation',
    muscle_groups: '["ischio-jambiers","fessiers","érecteurs du rachis"]',
    technical_notes: 'Dos neutre impératif. Barre proche des jambes, descendre jusqu\'à tension maximale des ischios. Genoux légèrement fléchis.',
  },
  {
    name: 'Fentes bulgares',
    type: 'musculation',
    muscle_groups: '["quadriceps","fessiers","ischio-jambiers"]',
    technical_notes: 'Pied arrière posé sur un banc. Descente verticale du genou avant. Excellent pour l\'équilibre et le gainage unilatéral.',
  },
  {
    name: 'Leg curl poulie',
    type: 'musculation',
    muscle_groups: '["ischio-jambiers"]',
    technical_notes: 'Debout ou à genoux face à la poulie basse. Flexion du genou, contraction maximale. Descente lente.',
  },
  {
    name: 'Mollets debout sur step',
    type: 'musculation',
    muscle_groups: '["gastrocnémiens","soléaires"]',
    technical_notes: 'Amplitude maximale : descente complète, montée explosive. Descente 3 secondes. Dernière série : 10 demi-reps en bas.',
  },
  {
    name: 'Pin Press',
    type: 'musculation',
    muscle_groups: '["triceps","pectoraux","deltoïdes antérieurs"]',
    technical_notes: 'Barre posée sur les sécurités avant chaque répétition. Renforce la phase initiale de poussée du développé couché.',
  },
];

export async function seedExercises(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises WHERE is_custom = 0'
  );

  if (existing && existing.count > 0) return;

  for (const ex of BASE_EXERCISES) {
    await db.runAsync(
      `INSERT INTO exercises (name, type, muscle_groups, technical_notes, is_custom)
       VALUES (?, ?, ?, ?, 0)`,
      [ex.name, ex.type, ex.muscle_groups, ex.technical_notes]
    );
  }
}

// ─── Types internes pour la description du programme ───────────────────────

type WeightType = 'fixed' | 'bodyweight' | 'bar';

type SetSpec = {
  reps_min: number;
  reps_max: number;
  weight: number | null;
  weight_type: WeightType;
  rest: number;
};

type BlockSpec = {
  name: string;
  is_work: boolean;
  sets: SetSpec[];
};

type ExerciseSpec = {
  exercise: string; // nom exact dans la table exercises
  blocks: BlockSpec[];
};

type WorkoutSpec = {
  name: string;
  exercises: ExerciseSpec[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function f(reps_min: number, reps_max: number, rest: number, weight: number | null = null): SetSpec {
  return { reps_min, reps_max, weight, weight_type: 'fixed', rest };
}

function bw(reps_min: number, reps_max: number, rest: number): SetSpec {
  return { reps_min, reps_max, weight: null, weight_type: 'bodyweight', rest };
}

function barOnly(reps: number, rest: number): SetSpec {
  return { reps_min: reps, reps_max: reps, weight: null, weight_type: 'bar', rest };
}

function workBlock(sets: SetSpec[]): BlockSpec {
  return { name: 'Travail', is_work: true, sets };
}

// ─── Programme PPL ──────────────────────────────────────────────────────────

const PPL: { name: string; description: string; workouts: WorkoutSpec[] } = {
  name: 'PPL — Push / Pull / Legs',
  description: 'Lundi Push · Mercredi Pull · Vendredi Legs · Sam/Dim Bonus. Séances 40–45 min, Bonus 25–30 min.',
  workouts: [
    // ── PUSH ──────────────────────────────────────────────────────────────
    {
      name: 'Push — Pecs / Épaules / Triceps',
      exercises: [
        {
          exercise: 'Développé couché barre',
          blocks: [
            {
              name: 'Échauffement',
              is_work: false,
              sets: [
                barOnly(10, 60),
                { reps_min: 5, reps_max: 5, weight: 40, weight_type: 'fixed', rest: 60 },
                { reps_min: 3, reps_max: 3, weight: 45, weight_type: 'fixed', rest: 90 },
              ],
            },
            {
              name: 'Travail',
              is_work: true,
              sets: [f(4, 6, 120), f(6, 8, 120), f(6, 8, 120), f(6, 8, 120)],
            },
            {
              name: 'Back-off',
              is_work: true,
              sets: [f(12, 15, 60)],
            },
          ],
        },
        { exercise: 'Développé incliné haltères', blocks: [workBlock([f(8, 10, 60), f(8, 10, 60), f(8, 10, 60)])] },
        { exercise: 'Élévations latérales haltères', blocks: [workBlock([f(15, 15, 60), f(15, 15, 60), f(15, 15, 60)])] },
        { exercise: 'Dips', blocks: [workBlock([bw(8, 12, 60), bw(8, 12, 60), bw(8, 12, 60)])] },
        { exercise: 'Extension triceps poulie haute', blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
        { exercise: 'Crunch poulie haute', blocks: [workBlock([f(12, 15, 45), f(12, 15, 45), f(12, 15, 45)])] },
      ],
    },

    // ── PULL ──────────────────────────────────────────────────────────────
    {
      name: 'Pull — Dos / Biceps / V',
      exercises: [
        { exercise: 'Tractions', blocks: [workBlock([bw(6, 10, 120), bw(6, 10, 120), bw(6, 10, 120), bw(6, 10, 120)])] },
        { exercise: 'Rowing barre', blocks: [workBlock([f(6, 8, 90), f(6, 8, 90), f(6, 8, 90), f(6, 8, 90)])] },
        { exercise: 'Face pull', blocks: [workBlock([f(15, 15, 60), f(15, 15, 60), f(15, 15, 60)])] },
        { exercise: 'Curl barre EZ', blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
        { exercise: 'Tirage poulie basse', blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
        { exercise: 'Relevés de jambes suspendu', blocks: [workBlock([bw(12, 15, 45), bw(12, 15, 45), bw(12, 15, 45)])] },
      ],
    },

    // ── LEGS ──────────────────────────────────────────────────────────────
    {
      name: 'Legs — Jambes',
      exercises: [
        { exercise: 'Squat barre', blocks: [workBlock([f(6, 8, 120), f(6, 8, 120), f(6, 8, 120), f(6, 8, 120)])] },
        { exercise: 'Romanian Deadlift', blocks: [workBlock([f(8, 8, 90), f(8, 8, 90), f(8, 8, 90)])] },
        { exercise: 'Fentes bulgares', blocks: [workBlock([f(10, 10, 60), f(10, 10, 60), f(10, 10, 60)])] },
        { exercise: 'Leg curl poulie', blocks: [workBlock([f(12, 12, 60), f(12, 12, 60), f(12, 12, 60)])] },
        { exercise: 'Mollets debout sur step', blocks: [workBlock([bw(15, 20, 45), bw(15, 20, 45), bw(15, 20, 45), bw(15, 20, 45)])] },
      ],
    },

    // ── BONUS ─────────────────────────────────────────────────────────────
    {
      name: 'Bonus — Force Couché / Bras / Épaules',
      exercises: [
        { exercise: 'Pin Press', blocks: [workBlock([f(5, 5, 120), f(5, 5, 120), f(5, 5, 120), f(5, 5, 120)])] },
        { exercise: 'Tractions', blocks: [workBlock([bw(6, 10, 90), bw(6, 10, 90), bw(6, 10, 90)])] },
        { exercise: 'Curl barre EZ', blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
        { exercise: 'Extension triceps poulie haute', blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
        { exercise: 'Élévations latérales haltères', blocks: [workBlock([f(15, 15, 60), f(15, 15, 60), f(15, 15, 60), f(15, 15, 60)])] },
        { exercise: 'Mollets debout sur step', blocks: [workBlock([bw(20, 20, 30), bw(20, 20, 30), bw(20, 20, 30)])] },
      ],
    },
  ],
};

// ─── Seed ───────────────────────────────────────────────────────────────────

export async function seedProgram(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM programs WHERE name = 'PPL — Push / Pull / Legs'"
  );
  if (existing && existing.count > 0) return;

  // Supprimer les anciens programmes (CASCADE → workouts → workout_exercises → blocks → sets → session_logs → set_logs)
  await db.runAsync('DELETE FROM programs');

  // Ajouter les exercices manquants
  for (const ex of EXTRA_EXERCISES) {
    const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM exercises WHERE name = ?', [ex.name]);
    if (!row) {
      await db.runAsync(
        'INSERT INTO exercises (name, type, muscle_groups, technical_notes, is_custom) VALUES (?, ?, ?, ?, 0)',
        [ex.name, ex.type, ex.muscle_groups, ex.technical_notes]
      );
    }
  }

  // Construire la map nom → id
  const allEx = await db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM exercises');
  const exMap = new Map(allEx.map(e => [e.name, e.id]));

  const getExId = (name: string): number => {
    const id = exMap.get(name);
    if (id === undefined) throw new Error(`Exercise not found in DB: ${name}`);
    return id;
  };

  // Programme
  const { lastInsertRowId: programId } = await db.runAsync(
    'INSERT INTO programs (name, description, is_active) VALUES (?, ?, 1)',
    [PPL.name, PPL.description]
  );

  // Séances
  for (let wi = 0; wi < PPL.workouts.length; wi++) {
    const workout = PPL.workouts[wi];
    const { lastInsertRowId: workoutId } = await db.runAsync(
      'INSERT INTO workouts (program_id, name, order_index) VALUES (?, ?, ?)',
      [programId, workout.name, wi]
    );

    // Exercices dans la séance
    for (let ei = 0; ei < workout.exercises.length; ei++) {
      const we = workout.exercises[ei];
      const { lastInsertRowId: weId } = await db.runAsync(
        'INSERT INTO workout_exercises (workout_id, exercise_id, order_index) VALUES (?, ?, ?)',
        [workoutId, getExId(we.exercise), ei]
      );

      // Blocs
      for (let bi = 0; bi < we.blocks.length; bi++) {
        const block = we.blocks[bi];
        const { lastInsertRowId: blockId } = await db.runAsync(
          'INSERT INTO blocks (workout_exercise_id, name, order_index, is_work_block) VALUES (?, ?, ?, ?)',
          [weId, block.name, bi, block.is_work ? 1 : 0]
        );

        // Séries
        for (let si = 0; si < block.sets.length; si++) {
          const s = block.sets[si];
          await db.runAsync(
            'INSERT INTO sets (block_id, reps_min, reps_max, weight, weight_type, rest_duration, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [blockId, s.reps_min, s.reps_max, s.weight, s.weight_type, s.rest, si]
          );
        }
      }
    }
  }
}
