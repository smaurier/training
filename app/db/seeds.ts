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
type ExerciseDefinition = {
  name: string;
  type: string;
  muscle_groups: string;
  technical_notes: string | null;
  description?: string;
};

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

  // ── Exercices templates ────────────────────────────────────────────────────
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
  {
    name: 'Tractions lestées',
    type: 'musculation',
    muscle_groups: '["dos","biceps","deltoïdes postérieurs"]',
    technical_notes: 'Même technique que les tractions, avec une ceinture lestée ou gilet lesté. Progression naturelle quand les tractions bodyweight sont maîtrisées.',
    description: 'Tractions avec charge additionnelle. Prise pronation ou supination. Bras tendus en bas, menton au-dessus de la barre. Idéal pour l\'hypertrophie du dos.',
  },
  {
    name: 'Curl biceps barre',
    type: 'musculation',
    muscle_groups: '["biceps","avant-bras"]',
    technical_notes: 'Coudes fixes contre les flancs. Prise supination, barre remontée jusqu\'à la contraction complète. Pas d\'élan du dos.',
    description: 'Curl avec barre droite ou barre EZ. Permet des charges plus lourdes que les haltères. Mouvement de base pour la masse des biceps.',
  },
  {
    name: 'Élévations latérales',
    type: 'musculation',
    muscle_groups: '["deltoïdes","trapèzes"]',
    technical_notes: 'Coudes légèrement fléchis. Monter jusqu\'à hauteur des épaules. Contrôle en descente. Éviter l\'élan.',
    description: 'Haltères ou câbles. Élévation latérale des bras pour isoler les deltoïdes latéraux. Base pour la largeur des épaules.',
  },
  {
    name: 'Mollets debout',
    type: 'musculation',
    muscle_groups: '["mollets","soléaires"]',
    technical_notes: 'Amplitude complète : talon bas puis pointe haute. Pause en haut et en bas. Poids sur l\'avant du pied.',
    description: 'Machine mollets debout ou avec barre. Extension plantaire en position debout. Isole les mollets (gastrocnémiens et soléaires).',
  },
  {
    name: 'Curl marteau haltères',
    type: 'musculation',
    muscle_groups: '["biceps","brachio-radial","avant-bras"]',
    technical_notes: 'Prise neutre (marteau). Coudes fixes contre les flancs. Montée jusqu\'à la contraction complète.',
    description: 'Haltères en prise neutre, pouce vers le haut. Travaille le biceps brachial, le brachio-radial et les avant-bras. Complément classique du curl supination.',
  },
  {
    name: 'Extensions quadriceps',
    type: 'musculation',
    muscle_groups: '["quadriceps"]',
    technical_notes: 'Dos plat contre le dossier. Extension complète, pause en haut. Descente contrôlée.',
    description: 'Machine à extension de jambes. Isolation du quadriceps. Souvent utilisé en finition ou pour la définition musculaire.',
  },
];

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
  weight: number | null;
  weight_type: WeightType;
  rest: number;
  duration_seconds?: number | null;
  weight_ratio?: number | null;
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

function f(reps_min: number, rest: number, weight: number | null = null, weight_ratio: number | null = null): SetSpec {
  return { reps_min, weight, weight_type: 'fixed', rest, weight_ratio };
}
function bw(reps_min: number, rest: number): SetSpec {
  return { reps_min, weight: null, weight_type: 'bodyweight', rest };
}
function barOnly(reps: number, rest: number): SetSpec {
  return { reps_min: reps, weight: null, weight_type: 'bar', rest };
}
// Mobilité/étirements : duration_seconds = durée réelle, reps_min = 1
function mob(seconds: number): SetSpec {
  return { reps_min: 1, weight: null, weight_type: 'bodyweight', rest: 0, duration_seconds: seconds };
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
              name: 'Travail',
              is_work: true,
              sets: [f(8, 120, 60), f(8, 120, 60), f(8, 120, 60), f(8, 120, 60)],
            },
            {
              name: 'Back-off',
              is_work: true,
              sets: [f(12, 60, null, 0.8)],
            },
          ],
        },
        { exercise: 'Développé incliné haltères',    blocks: [workBlock([f(8, 60, 16), f(8, 60, 16), f(8, 60, 16)])] },
        { exercise: 'Élévations latérales haltères', blocks: [workBlock([f(15, 60, 8), f(15, 60, 8), f(15, 60, 8)])] },
        { exercise: 'Dips',                          blocks: [workBlock([bw(8, 60), bw(8, 60), bw(8, 60)])] },
        { exercise: 'Extension triceps poulie haute', blocks: [workBlock([f(10, 60, 20), f(10, 60, 20), f(10, 60, 20)])] },
        { exercise: 'Crunch poulie haute',           blocks: [workBlock([f(12, 45, 25), f(12, 45, 25), f(12, 45, 25)])] },

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
        { exercise: 'Footing',                 blocks: [workBlock([bw(1, 0)])] },
        { exercise: 'Deep squat hold',         blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Couch stretch',           blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Étirement mollets',       blocks: [stretchBlock([mob(60)])] },
        { exercise: "World's Greatest Stretch", blocks: [stretchBlock([bw(5, 0)])] },
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
        { exercise: 'Tractions',           blocks: [workBlock([bw(8, 90), bw(8, 90), bw(8, 90), bw(8, 90)])] },
        { exercise: 'Rowing barre',        blocks: [workBlock([f(8, 90, 50), f(8, 90, 50), f(8, 90, 50), f(8, 90, 50)])] },
        { exercise: 'Face pull',           blocks: [workBlock([f(15, 60, 20), f(15, 60, 20), f(15, 60, 20)])] },
        { exercise: 'Curl barre EZ',       blocks: [workBlock([f(10, 60, 20), f(10, 60, 20), f(10, 60, 20)])] },
        { exercise: 'Tirage poulie basse', blocks: [workBlock([f(10, 60, 30), f(10, 60, 30), f(10, 60, 30)])] },
        { exercise: 'Relevés de jambes suspendu', blocks: [workBlock([bw(12, 45), bw(12, 45), bw(12, 45)])] },

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
        { exercise: 'Footing',           blocks: [workBlock([bw(1, 0)])] },
        { exercise: 'Deep squat hold',   blocks: [stretchBlock([mob(60)])] },
        { exercise: 'Cossack squat',     blocks: [stretchBlock([bw(8, 0)])] },
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
        { exercise: 'Cossack squat',            blocks: [mobilityBlock([bw(8, 0)])] },

        // Musculation
        { exercise: 'Squat barre',       blocks: [workBlock([f(8, 120, 60), f(8, 120, 60), f(8, 120, 60), f(8, 120, 60)])] },
        { exercise: 'Romanian Deadlift', blocks: [workBlock([f(8, 90, 50), f(8, 90, 50), f(8, 90, 50)])] },
        { exercise: 'Fentes bulgares',   blocks: [workBlock([f(10, 60, 14), f(10, 60, 14), f(10, 60, 14)])] },
        { exercise: 'Leg curl poulie',   blocks: [workBlock([f(12, 60, 30), f(12, 60, 30), f(12, 60, 30)])] },
        { exercise: 'Mollets debout sur step', blocks: [workBlock([bw(15, 45), bw(15, 45), bw(15, 45), bw(15, 45)])] },

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
        { exercise: 'Pin Press',                     blocks: [workBlock([f(5, 120, 40), f(5, 120, 40), f(5, 120, 40), f(5, 120, 40)])] },
        { exercise: 'Tractions',                     blocks: [workBlock([bw(6, 90), bw(6, 90), bw(6, 90)])] },
        { exercise: 'Curl barre EZ',                 blocks: [workBlock([f(10, 60, 20), f(10, 60, 20), f(10, 60, 20), f(10, 60, 20)])] },
        { exercise: 'Extension triceps poulie haute', blocks: [workBlock([f(10, 60, 20), f(10, 60, 20), f(10, 60, 20), f(10, 60, 20)])] },
        { exercise: 'Élévations latérales haltères', blocks: [workBlock([f(15, 60, 8), f(15, 60, 8), f(15, 60, 8), f(15, 60, 8)])] },
        { exercise: 'Mollets debout sur step',       blocks: [workBlock([bw(20, 30), bw(20, 30), bw(20, 30)])] },

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
  // Ajouter les exercices manquants (upsert by name)
  for (const ex of EXTRA_EXERCISES) {
    const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM exercises WHERE name = ?', [ex.name]);
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
  }

  for (const [name, desc] of Object.entries(BASE_EXERCISE_DESCRIPTIONS)) {
    await db.runAsync('UPDATE exercises SET description = ? WHERE name = ?', [desc, name]);
  }

  const allEx = await db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM exercises');
  const exMap = new Map(allEx.map(e => [e.name, e.id]));
  const getExId = (name: string): number => {
    const id = exMap.get(name);
    if (id === undefined) throw new Error(`Exercise not found in DB: ${name}`);
    return id;
  };

  // Programme — get or create by name
  let programId: number;
  const existingProgram = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM programs WHERE name = ?', [PPL.name]
  );
  if (existingProgram) {
    programId = existingProgram.id;
  } else {
    const { lastInsertRowId } = await db.runAsync(
      'INSERT INTO programs (name, description, is_active) VALUES (?, ?, 1)',
      [PPL.name, PPL.description]
    );
    programId = lastInsertRowId;
  }

  // Supprimer les blocs Échauffement hardcodés (remplacés par WarmupPhase dynamique)
  await db.runAsync(
    `DELETE FROM blocks WHERE name = 'Échauffement'
     AND workout_exercise_id IN (
       SELECT id FROM workout_exercises
       WHERE workout_id IN (SELECT id FROM workouts WHERE program_id = ?)
     )`,
    [programId]
  );

  for (let wi = 0; wi < PPL.workouts.length; wi++) {
    const workout = PPL.workouts[wi];

    // Workout — get or create by (program_id, name)
    let workoutId: number;
    const existingWorkout = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM workouts WHERE program_id = ? AND name = ?', [programId, workout.name]
    );
    if (existingWorkout) {
      workoutId = existingWorkout.id;
      await db.runAsync('UPDATE workouts SET order_index = ? WHERE id = ?', [wi, workoutId]);
    } else {
      const { lastInsertRowId } = await db.runAsync(
        'INSERT INTO workouts (program_id, name, order_index) VALUES (?, ?, ?)',
        [programId, workout.name, wi]
      );
      workoutId = lastInsertRowId;
    }

    for (let ei = 0; ei < workout.exercises.length; ei++) {
      const we = workout.exercises[ei];
      const exId = getExId(we.exercise);

      // WorkoutExercise — get or create by (workout_id, exercise_id)
      let weId: number;
      const existingWe = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM workout_exercises WHERE workout_id = ? AND exercise_id = ?', [workoutId, exId]
      );
      if (existingWe) {
        weId = existingWe.id;
        await db.runAsync('UPDATE workout_exercises SET order_index = ? WHERE id = ?', [ei, weId]);
      } else {
        const { lastInsertRowId } = await db.runAsync(
          'INSERT INTO workout_exercises (workout_id, exercise_id, order_index) VALUES (?, ?, ?)',
          [workoutId, exId, ei]
        );
        weId = lastInsertRowId;
      }

      for (let bi = 0; bi < we.blocks.length; bi++) {
        const block = we.blocks[bi];

        // Block — get or create by (workout_exercise_id, name)
        let blockId: number;
        const existingBlock = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM blocks WHERE workout_exercise_id = ? AND name = ?', [weId, block.name]
        );
        if (existingBlock) {
          blockId = existingBlock.id;
          await db.runAsync(
            'UPDATE blocks SET order_index = ?, is_work_block = ? WHERE id = ?',
            [bi, block.is_work ? 1 : 0, blockId]
          );
        } else {
          const { lastInsertRowId } = await db.runAsync(
            'INSERT INTO blocks (workout_exercise_id, name, order_index, is_work_block) VALUES (?, ?, ?, ?)',
            [weId, block.name, bi, block.is_work ? 1 : 0]
          );
          blockId = lastInsertRowId;
        }

        for (let si = 0; si < block.sets.length; si++) {
          const s = block.sets[si];

          // Set — get or create by (block_id, order_index)
          // If has set_logs → preserve weight (only update reps_min, rest_duration, duration_seconds)
          // If no set_logs → update everything including weight
          const existingSet = await db.getFirstAsync<{ id: number; weight: number | null }>(
            'SELECT id, weight FROM sets WHERE block_id = ? AND order_index = ?', [blockId, si]
          );
          if (existingSet) {
            const hasLogs = await db.getFirstAsync<{ count: number }>(
              'SELECT COUNT(*) as count FROM set_logs WHERE set_id = ?', [existingSet.id]
            );
            const preserveWeight = (hasLogs?.count ?? 0) > 0 || existingSet.weight !== null;
            if (preserveWeight) {
              await db.runAsync(
                'UPDATE sets SET reps_min = ?, weight_type = ?, rest_duration = ?, duration_seconds = ?, weight_ratio = ? WHERE id = ?',
                [s.reps_min, s.weight_type, s.rest, s.duration_seconds ?? null, s.weight_ratio ?? null, existingSet.id]
              );
            } else {
              await db.runAsync(
                'UPDATE sets SET reps_min = ?, weight = ?, weight_type = ?, rest_duration = ?, duration_seconds = ?, weight_ratio = ? WHERE id = ?',
                [s.reps_min, s.weight, s.weight_type, s.rest, s.duration_seconds ?? null, s.weight_ratio ?? null, existingSet.id]
              );
            }
          } else {
            await db.runAsync(
              'INSERT INTO sets (block_id, reps_min, weight, weight_type, rest_duration, order_index, duration_seconds, weight_ratio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [blockId, s.reps_min, s.weight, s.weight_type, s.rest, si, s.duration_seconds ?? null, s.weight_ratio ?? null]
            );
          }
        }
      }
    }
  }
}
