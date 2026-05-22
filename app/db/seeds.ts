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
