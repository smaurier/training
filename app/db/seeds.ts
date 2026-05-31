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

// Exercices supplémentaires : PPL + mobilité/étirements
const EXTRA_EXERCISES = [
  // ── Musculation PPL ────────────────────────────────────────────────────────
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

  // ── Mobilité — avant séance ────────────────────────────────────────────────
  {
    name: 'Cercles épaules',
    type: 'etirement',
    muscle_groups: '["deltoïdes","coiffe des rotateurs"]',
    technical_notes: 'Grands cercles lents vers l\'avant puis vers l\'arrière. Amplitude maximale.',
  },
  {
    name: 'Rotations thoraciques',
    type: 'etirement',
    muscle_groups: '["érecteurs du rachis","obliques"]',
    technical_notes: 'Assis ou à quatre pattes. Rotation du torse en ouvrant le coude vers le plafond. Reps = par côté.',
  },
  {
    name: 'Band pull-aparts',
    type: 'etirement',
    muscle_groups: '["deltoïdes postérieurs","rhomboïdes","trapèzes"]',
    technical_notes: 'Bras tendus devant soi, élastique horizontal. Écarter les bras jusqu\'à toucher la poitrine. Coudes légèrement fléchis.',
  },
  {
    name: 'Suspension passive',
    type: 'etirement',
    muscle_groups: '["érecteurs du rachis","grand dorsal","épaules"]',
    technical_notes: 'Suspendu à une barre, relâcher complètement le dos. Décompresse la colonne vertébrale.',
  },
  {
    name: 'Cat-cow',
    type: 'etirement',
    muscle_groups: '["érecteurs du rachis","abdominaux"]',
    technical_notes: 'À quatre pattes. Alterner arrondi du dos (cat) et creux du dos (cow). Synchroniser avec la respiration.',
  },
  {
    name: 'Hip hinge léger',
    type: 'etirement',
    muscle_groups: '["ischio-jambiers","fessiers","érecteurs du rachis"]',
    technical_notes: 'Debout, mains sur les hanches. Charnière au niveau des hanches, dos plat. Activation de la chaîne postérieure.',
  },
  {
    name: 'Rotations poignets',
    type: 'etirement',
    muscle_groups: '["poignets","avant-bras"]',
    technical_notes: 'Bras tendus devant soi. Grands cercles lents dans les deux sens. Reps = par côté.',
  },

  // ── Étirements — après séance ──────────────────────────────────────────────
  {
    name: 'Étirement pectoraux au mur',
    type: 'etirement',
    muscle_groups: '["pectoraux","deltoïdes antérieurs"]',
    technical_notes: 'Bras à 90° contre un mur. Rotation lente du corps vers l\'opposé. Durée par côté.',
  },
  {
    name: 'Child pose',
    type: 'etirement',
    muscle_groups: '["grand dorsal","érecteurs du rachis","épaules"]',
    technical_notes: 'À genoux, bras tendus devant soi, front au sol. Respiration profonde.',
  },
  {
    name: 'Couch stretch',
    type: 'etirement',
    muscle_groups: '["fléchisseurs de hanche","quadriceps"]',
    technical_notes: 'Pied arrière contre un mur, genou au sol. Avancer les hanches. Critique pour les coureurs. Durée par côté.',
  },
  {
    name: 'Respiration diaphragmatique',
    type: 'etirement',
    muscle_groups: '["diaphragme"]',
    technical_notes: 'Allongé sur le dos. Inspiration 4 sec, rétention 4 sec, expiration 6 sec. Durée totale.',
  },
  {
    name: 'Étirement dorsaux',
    type: 'etirement',
    muscle_groups: '["grand dorsal","rhomboïdes"]',
    technical_notes: 'Bras croisés, traction vers la poitrine ou étirement latéral suspendu.',
  },
  {
    name: 'Child pose latéral',
    type: 'etirement',
    muscle_groups: '["grand dorsal","intercostaux","obliques"]',
    technical_notes: 'Child pose avec bras décalés vers le côté. Tire la chaîne latérale. Durée par côté.',
  },
  {
    name: 'Figure 4 stretch',
    type: 'etirement',
    muscle_groups: '["piriforme","fessiers","rotateurs externes de hanche"]',
    technical_notes: 'Allongé sur le dos, cheville posée sur le genou opposé. Tirer la cuisse vers la poitrine. Durée par côté.',
  },
  {
    name: 'Deep squat hold',
    type: 'etirement',
    muscle_groups: '["hanches","chevilles","fessiers","adducteurs"]',
    technical_notes: 'Position squat profond maintenue, talons au sol si possible. Coudes contre les genoux pour ouvrir les hanches.',
  },
  {
    name: 'Leg swings avant/arrière',
    type: 'etirement',
    muscle_groups: '["fléchisseurs de hanche","ischio-jambiers"]',
    technical_notes: 'Debout, appui sur un mur. Balancer la jambe en pendule avant/arrière. Amplitude progressive. Reps = par jambe.',
  },
  {
    name: 'Leg swings latéraux',
    type: 'etirement',
    muscle_groups: '["abducteurs","adducteurs","fléchisseurs de hanche"]',
    technical_notes: 'Debout, appui sur un mur. Balancer la jambe latéralement. Amplitude progressive. Reps = par jambe.',
  },
  {
    name: 'Cossack squat',
    type: 'etirement',
    muscle_groups: '["adducteurs","hanches","chevilles","quadriceps"]',
    technical_notes: 'Squat latéral alterné. Jambe tendue d\'un côté, genou fléchi de l\'autre. Excellent pour la mobilité de hanche.',
  },
  {
    name: 'Étirement mollets',
    type: 'etirement',
    muscle_groups: '["gastrocnémiens","soléaires"]',
    technical_notes: 'Contre un mur ou sur un step. Jambe tendue pour gastrocnémien, légèrement fléchie pour soléaire. Durée par côté.',
  },
  {
    name: 'Butterfly stretch',
    type: 'etirement',
    muscle_groups: '["adducteurs","fléchisseurs de hanche"]',
    technical_notes: 'Assis, plantes de pieds jointes, genoux vers le sol. Pencher légèrement le buste vers l\'avant.',
  },
  {
    name: 'Pigeon pose',
    type: 'etirement',
    muscle_groups: '["piriforme","fessiers","fléchisseurs de hanche"]',
    technical_notes: 'Jambe avant à 90°, jambe arrière tendue. Étirement profond des hanches. Essentiel pour les coureurs. Durée par côté.',
  },
  {
    name: 'Étirement épaule cross-body',
    type: 'etirement',
    muscle_groups: '["deltoïdes postérieurs","rhomboïdes"]',
    technical_notes: 'Bras croisé devant la poitrine, maintenu par le bras opposé. Durée par côté.',
  },

  // ── Footing — récupération et mobilité ────────────────────────────────────
  {
    name: "World's Greatest Stretch",
    type: 'etirement',
    muscle_groups: '["fléchisseurs de hanche","ischio-jambiers","thoracique","épaules"]',
    technical_notes: 'Fente avant avec main au sol, rotation du buste en levant le bras vers le plafond. Mobilité multi-plan. Reps = par côté.',
  },
  {
    name: 'Pancake stretch',
    type: 'etirement',
    muscle_groups: '["adducteurs","ischio-jambiers","érecteurs du rachis"]',
    technical_notes: 'Assis au sol, jambes écartées au maximum. Incliner doucement le buste vers l\'avant, dos droit. Début de travail grand écart latéral. Progressif, sans forcer.',
  },
  {
    name: 'Frog stretch',
    type: 'etirement',
    muscle_groups: '["adducteurs","hanches","fléchisseurs de hanche"]',
    technical_notes: 'À quatre pattes, genoux écartés au-delà de la largeur des hanches, pieds vers l\'extérieur. Reculer doucement les fesses. TRÈS léger — pas de douleur articulaire. Début de travail grand écart latéral.',
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

// ─── Types internes ──────────────────────────────────────────────────────────

type WeightType = 'fixed' | 'bodyweight' | 'bar';

type SetSpec = {
  reps_min: number;
  reps_max: number;
  weight: number | null;
  weight_type: WeightType;
  rest: number;
  duration_seconds?: number | null;
};

type BlockSpec = {
  name: string;
  is_work: boolean;
  sets: SetSpec[];
};

type ExerciseSpec = {
  exercise: string;
  blocks: BlockSpec[];
};

type WorkoutSpec = {
  name: string;
  exercises: ExerciseSpec[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function f(reps_min: number, reps_max: number, rest: number, weight: number | null = null): SetSpec {
  return { reps_min, reps_max, weight, weight_type: 'fixed', rest };
}
function bw(reps_min: number, reps_max: number, rest: number): SetSpec {
  return { reps_min, reps_max, weight: null, weight_type: 'bodyweight', rest };
}
function barOnly(reps: number, rest: number): SetSpec {
  return { reps_min: reps, reps_max: reps, weight: null, weight_type: 'bar', rest };
}
// Mobilité/étirements : duration_seconds = durée réelle, reps_min/max = 1
function mob(seconds: number): SetSpec {
  return { reps_min: 1, reps_max: 1, weight: null, weight_type: 'bodyweight', rest: 0, duration_seconds: seconds };
}

function workBlock(sets: SetSpec[]): BlockSpec {
  return { name: 'Travail', is_work: true, sets };
}
// Exercices de mobilité/activation avant séance (pas d'échauffement — inclus dans les premières séries des exos)
function mobilityBlock(sets: SetSpec[]): BlockSpec {
  return { name: 'Mobilité', is_work: false, sets };
}
// Étirements post-séance ou post-footing
function stretchBlock(sets: SetSpec[]): BlockSpec {
  return { name: 'Étirements', is_work: false, sets };
}

// ─── Programme PPL ───────────────────────────────────────────────────────────

const PPL: { name: string; description: string; workouts: WorkoutSpec[] } = {
  name: 'PPL — Push / Pull / Legs',
  description: 'Lundi Push · Mardi Footing · Mercredi Pull · Jeudi Footing · Vendredi Legs · Sam/Dim Bonus.',
  workouts: [

    // ── LUNDI : PUSH ──────────────────────────────────────────────────────────
    {
      name: 'Push — Pecs / Épaules / Triceps',
      exercises: [
        // Mobilité (5 min) — activation articulaire avant pressing
        { exercise: 'Cercles épaules',       blocks: [mobilityBlock([mob(20)])] },
        { exercise: 'Rotations thoraciques', blocks: [mobilityBlock([mob(10)])] },
        { exercise: 'Band pull-aparts',      blocks: [mobilityBlock([mob(20)])] },
        { exercise: 'Suspension passive',    blocks: [mobilityBlock([mob(30)])] },

        // Musculation
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
        { exercise: 'Développé incliné haltères',    blocks: [workBlock([f(8, 10, 60), f(8, 10, 60), f(8, 10, 60)])] },
        { exercise: 'Élévations latérales haltères', blocks: [workBlock([f(15, 15, 60), f(15, 15, 60), f(15, 15, 60)])] },
        { exercise: 'Dips',                          blocks: [workBlock([bw(8, 12, 60), bw(8, 12, 60), bw(8, 12, 60)])] },
        { exercise: 'Extension triceps poulie haute', blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
        { exercise: 'Crunch poulie haute',           blocks: [workBlock([f(12, 15, 45), f(12, 15, 45), f(12, 15, 45)])] },

        // Étirements (5–10 min)
        { exercise: 'Étirement pectoraux au mur', blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Child pose',                 blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Couch stretch',              blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Respiration diaphragmatique', blocks: [stretchBlock([mob(120)])] },
      ],
    },

    // ── MARDI : FOOTING + RÉCUPÉRATION ───────────────────────────────────────
    {
      name: 'Footing Mardi — Récupération',
      exercises: [
        { exercise: 'Deep squat hold',         blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Couch stretch',           blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Étirement mollets',       blocks: [stretchBlock([mob(60)])] },
        { exercise: "World's Greatest Stretch", blocks: [stretchBlock([bw(5, 5, 0)])] },
        { exercise: 'Pancake stretch',         blocks: [stretchBlock([mob(60)])] },
      ],
    },

    // ── MERCREDI : PULL ───────────────────────────────────────────────────────
    {
      name: 'Pull — Dos / Biceps / V',
      exercises: [
        // Mobilité (5 min)
        { exercise: 'Cat-cow',               blocks: [mobilityBlock([mob(10)])] },
        { exercise: 'Rotations thoraciques', blocks: [mobilityBlock([mob(10)])] },
        { exercise: 'Suspension passive',    blocks: [mobilityBlock([mob(30)])] },
        { exercise: 'Hip hinge léger',       blocks: [mobilityBlock([mob(10)])] },

        // Musculation
        { exercise: 'Tractions',           blocks: [workBlock([bw(6, 10, 120), bw(6, 10, 120), bw(6, 10, 120), bw(6, 10, 120)])] },
        { exercise: 'Rowing barre',        blocks: [workBlock([f(6, 8, 90), f(6, 8, 90), f(6, 8, 90), f(6, 8, 90)])] },
        { exercise: 'Face pull',           blocks: [workBlock([f(15, 15, 60), f(15, 15, 60), f(15, 15, 60)])] },
        { exercise: 'Curl barre EZ',       blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
        { exercise: 'Tirage poulie basse', blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
        { exercise: 'Relevés de jambes suspendu', blocks: [workBlock([bw(12, 15, 45), bw(12, 15, 45), bw(12, 15, 45)])] },

        // Étirements (5–10 min)
        { exercise: 'Étirement dorsaux',          blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Child pose latéral',         blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Figure 4 stretch',           blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Respiration diaphragmatique', blocks: [stretchBlock([mob(120)])] },
      ],
    },

    // ── JEUDI : FOOTING + MOBILITÉ ────────────────────────────────────────────
    {
      name: 'Footing Jeudi — Mobilité',
      exercises: [
        { exercise: 'Deep squat hold',   blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Cossack squat',     blocks: [stretchBlock([bw(8, 8, 0)])] },
        { exercise: 'Butterfly stretch', blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Pancake stretch',   blocks: [stretchBlock([mob(90)])] },   // progression vs mardi
        { exercise: 'Frog stretch',      blocks: [stretchBlock([mob(45)])] },   // 30–60 sec, progressif
      ],
    },

    // ── VENDREDI : LEGS ───────────────────────────────────────────────────────
    {
      name: 'Legs — Jambes',
      exercises: [
        // Mobilité (5 min) — dynamique, axé hanche/cheville
        { exercise: 'Deep squat hold',          blocks: [mobilityBlock([mob(30)])] },
        { exercise: 'Leg swings avant/arrière', blocks: [mobilityBlock([mob(10)])] },
        { exercise: 'Leg swings latéraux',      blocks: [mobilityBlock([mob(10)])] },
        { exercise: 'Cossack squat',            blocks: [mobilityBlock([bw(8, 8, 0)])] },

        // Musculation
        { exercise: 'Squat barre',       blocks: [workBlock([f(6, 8, 120), f(6, 8, 120), f(6, 8, 120), f(6, 8, 120)])] },
        { exercise: 'Romanian Deadlift', blocks: [workBlock([f(8, 8, 90), f(8, 8, 90), f(8, 8, 90)])] },
        { exercise: 'Fentes bulgares',   blocks: [workBlock([f(10, 10, 60), f(10, 10, 60), f(10, 10, 60)])] },
        { exercise: 'Leg curl poulie',   blocks: [workBlock([f(12, 12, 60), f(12, 12, 60), f(12, 12, 60)])] },
        { exercise: 'Mollets debout sur step', blocks: [workBlock([bw(15, 20, 45), bw(15, 20, 45), bw(15, 20, 45), bw(15, 20, 45)])] },

        // Étirements très léger (5 min)
        { exercise: 'Couch stretch',              blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Étirement mollets',          blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Butterfly stretch',          blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Respiration diaphragmatique', blocks: [stretchBlock([mob(120)])] },
      ],
    },

    // ── BONUS : Force couché + Bras + Épaules ─────────────────────────────────
    // Mobilité ciblée pressing + bridge running
    {
      name: 'Bonus — Force Couché / Bras / Épaules',
      exercises: [
        // Mobilité (5 min)
        { exercise: 'Cercles épaules',    blocks: [mobilityBlock([mob(20)])] },
        { exercise: 'Band pull-aparts',   blocks: [mobilityBlock([mob(15)])] },
        { exercise: 'Couch stretch',      blocks: [mobilityBlock([mob(30)])] },
        { exercise: 'Rotations poignets', blocks: [mobilityBlock([mob(10)])] },

        // Musculation
        { exercise: 'Pin Press',                     blocks: [workBlock([f(5, 5, 120), f(5, 5, 120), f(5, 5, 120), f(5, 5, 120)])] },
        { exercise: 'Tractions',                     blocks: [workBlock([bw(6, 10, 90), bw(6, 10, 90), bw(6, 10, 90)])] },
        { exercise: 'Curl barre EZ',                 blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
        { exercise: 'Extension triceps poulie haute', blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
        { exercise: 'Élévations latérales haltères', blocks: [workBlock([f(15, 15, 60), f(15, 15, 60), f(15, 15, 60), f(15, 15, 60)])] },
        { exercise: 'Mollets debout sur step',       blocks: [workBlock([bw(20, 20, 30), bw(20, 20, 30), bw(20, 20, 30)])] },

        // Étirements bridge running (8 min)
        { exercise: 'Pigeon pose',                blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Couch stretch',              blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Étirement épaule cross-body', blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Étirement mollets',          blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Respiration diaphragmatique', blocks: [stretchBlock([mob(120)])] },
      ],
    },
  ],
};

// ─── Seed ────────────────────────────────────────────────────────────────────

export async function seedProgram(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM programs WHERE name = 'PPL — Push / Pull / Legs'"
  );
  if (existing && existing.count > 0) return;

  // Supprimer les anciens programmes (CASCADE → workouts → workout_exercises → blocks → sets → session_logs)
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
            'INSERT INTO sets (block_id, reps_min, reps_max, weight, weight_type, rest_duration, order_index, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [blockId, s.reps_min, s.reps_max, s.weight, s.weight_type, s.rest, si, s.duration_seconds ?? null]
          );
        }
      }
    }
  }
}
