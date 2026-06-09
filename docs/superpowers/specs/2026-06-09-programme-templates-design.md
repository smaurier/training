# Programme Templates — Design

**Goal:** Permettre à l'utilisateur d'importer des programmes d'entraînement pré-construits depuis une bibliothèque de templates, accessible depuis l'onglet Programmes.

**Architecture:** Définitions TypeScript dans `app/data/templates.ts` (pas de DB). `TemplateService.importTemplate()` utilise les repos existants pour créer programme + séances + blocs + séries. UI : FAB "+" → BottomSheet → écran import → input nom → import.

**Tech Stack:** TypeScript strict, Expo SQLite, React Native, @gorhom/bottom-sheet, react-native-gesture-handler

---

## Scope

**In scope:**
- Installer `@gorhom/bottom-sheet` + `react-native-gesture-handler`, wrapper `_layout.tsx` dans `GestureHandlerRootView`
- Migration v7 : colonne `template_id TEXT` sur `programmes` (tracking template d'origine)
- 7 nouveaux exercices dans `seeds.ts`
- 5 templates définis dans `app/data/templates.ts`
- `TemplateService` avec tests unitaires
- Flux UI complet : BottomSheet → `/import-template` → import
- Warning si template déjà importé

**Out of scope:**
- Preview détaillé des séances avant import
- Mise à jour d'un template déjà importé
- Partage / export de templates
- Templates serveur

---

## Migration v7 — `template_id` sur `programmes`

Nouvelle colonne nullable sur `programmes` :

```sql
ALTER TABLE programmes ADD COLUMN template_id TEXT;
```

- `NULL` = programme personnalisé
- Non-null = importé depuis un template (valeur = `TemplateDefinition.id`)

Permet de détecter si un template a déjà été importé via :
```sql
SELECT COUNT(*) FROM programmes WHERE template_id = ?
```

---

## Nouveaux exercices (seeds.ts)

7 exercices à ajouter (type `musculation`) :

| Nom | Groupes musculaires |
|---|---|
| Soulevé de terre | `["dos","jambes","lombaires"]` |
| Soulevé de terre jambes tendues | `["ischio-jambiers","lombaires","fessiers"]` |
| Tirage poitrine | `["dos","biceps"]` |
| Skull crusher | `["triceps"]` |
| Oiseau haltères | `["epaules","dos"]` |
| Élévations frontales | `["epaules"]` |
| Écarté couché haltères | `["pectoraux"]` |

---

## Template Content

### 5x5 Stronglifts (`5x5-stronglifts`)
- **Niveau :** Débutant | **Fréquence :** 3j/sem | **Description :** Force pure sur les 5 grands mouvements. Alternance A/B.

**Séance A :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Squat barre | 5 | 5–5 | 180s |
| Travail | Développé couché barre | 5 | 5–5 | 180s |
| Travail | Rowing barre | 5 | 5–5 | 180s |

**Séance B :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Squat barre | 5 | 5–5 | 180s |
| Travail | Développé militaire barre | 5 | 5–5 | 180s |
| Travail | Soulevé de terre | 1 | 5–5 | 240s |

---

### Full Body 3j (`full-body-3j`)
- **Niveau :** Débutant | **Fréquence :** 3j/sem | **Description :** Séance unique répétée 3× par semaine. Tous les muscles à chaque séance.

**Séance Full Body :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Squat barre | 3 | 8–10 | 120s |
| Travail | Développé couché barre | 3 | 8–10 | 120s |
| Travail | Rowing barre | 3 | 8–10 | 120s |
| Travail | Développé militaire barre | 3 | 8–10 | 90s |
| Travail | Soulevé de terre | 3 | 6–8 | 150s |
| Travail | Tractions lestées | 3 | 5–8 | 120s |

---

### Upper / Lower 4j (`upper-lower-4j`)
- **Niveau :** Intermédiaire | **Fréquence :** 4j/sem | **Description :** 2 séances haut / 2 séances bas. Alternance force / hypertrophie.

**Haut A — Force :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Développé couché barre | 4 | 4–6 | 180s |
| Travail | Rowing barre | 4 | 4–6 | 180s |
| Travail | Développé militaire barre | 3 | 4–6 | 150s |
| Travail | Tractions lestées | 3 | 4–6 | 150s |
| Travail | Curl biceps barre | 3 | 8–10 | 90s |
| Travail | Dips | 3 | 6–8 | 90s |

**Bas A — Force :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Squat barre | 4 | 4–6 | 180s |
| Travail | Soulevé de terre | 3 | 4–6 | 180s |
| Travail | Presse à cuisses | 3 | 8–10 | 120s |
| Travail | Leg curl couché | 3 | 8–10 | 90s |

**Haut B — Hypertrophie :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Développé incliné haltères | 4 | 8–12 | 90s |
| Travail | Tirage poitrine | 4 | 8–12 | 90s |
| Travail | Élévations latérales | 3 | 12–15 | 60s |
| Travail | Curl marteau haltères | 3 | 10–12 | 60s |
| Travail | Dips | 3 | 8–12 | 90s |
| Travail | Face pull | 3 | 12–15 | 60s |

**Bas B — Hypertrophie :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Squat barre | 4 | 8–12 | 120s |
| Travail | Soulevé de terre jambes tendues | 3 | 10–12 | 90s |
| Travail | Presse à cuisses | 3 | 12–15 | 90s |
| Travail | Extensions quadriceps | 3 | 12–15 | 60s |
| Travail | Leg curl couché | 3 | 12–15 | 60s |
| Travail | Mollets debout | 4 | 15–20 | 60s |

---

### Bro Split 5j (`bro-split-5j`)
- **Niveau :** Intermédiaire | **Fréquence :** 5j/sem | **Description :** Une séance par groupe musculaire. Classique hypertrophie.

**Pectoraux :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Développé couché barre | 4 | 8–10 | 120s |
| Travail | Développé incliné haltères | 3 | 10–12 | 90s |
| Travail | Dips | 3 | 10–12 | 90s |
| Travail | Écarté couché haltères | 3 | 12–15 | 60s |

**Dos :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Soulevé de terre | 3 | 6–8 | 180s |
| Travail | Tractions lestées | 4 | 6–8 | 120s |
| Travail | Rowing barre | 4 | 8–10 | 120s |
| Travail | Tirage poitrine | 3 | 10–12 | 90s |

**Épaules :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Développé militaire barre | 4 | 8–10 | 120s |
| Travail | Élévations latérales | 3 | 12–15 | 60s |
| Travail | Élévations frontales | 3 | 12–15 | 60s |
| Travail | Oiseau haltères | 3 | 12–15 | 60s |

**Bras :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Curl biceps barre | 4 | 8–10 | 90s |
| Travail | Curl marteau haltères | 3 | 10–12 | 90s |
| Travail | Skull crusher | 4 | 8–10 | 90s |
| Travail | Dips | 3 | 10–12 | 90s |

**Jambes :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Squat barre | 4 | 8–10 | 120s |
| Travail | Soulevé de terre jambes tendues | 3 | 10–12 | 90s |
| Travail | Presse à cuisses | 3 | 12–15 | 90s |
| Travail | Extensions quadriceps | 3 | 12–15 | 60s |
| Travail | Leg curl couché | 3 | 12–15 | 60s |
| Travail | Mollets debout | 4 | 15–20 | 60s |

---

### Arnold Split 6j (`arnold-split-6j`)
- **Niveau :** Avancé | **Fréquence :** 6j/sem | **Description :** 3 séances répétées 2× par semaine. Classique Arnold.

**Pectoraux + Dos :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Développé couché barre | 4 | 6–8 | 150s |
| Travail | Tractions lestées | 4 | 6–8 | 150s |
| Travail | Développé incliné haltères | 3 | 8–10 | 90s |
| Travail | Rowing barre | 3 | 8–10 | 90s |
| Travail | Écarté couché haltères | 3 | 10–12 | 60s |
| Travail | Tirage poitrine | 3 | 10–12 | 60s |

**Épaules + Bras :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Développé militaire barre | 4 | 6–8 | 150s |
| Travail | Curl biceps barre | 4 | 8–10 | 90s |
| Travail | Élévations latérales | 3 | 10–12 | 60s |
| Travail | Skull crusher | 3 | 8–10 | 90s |
| Travail | Oiseau haltères | 3 | 12–15 | 60s |
| Travail | Curl marteau haltères | 3 | 10–12 | 60s |

**Jambes :**
| Bloc | Exercice | Séries | Reps | Repos |
|---|---|---|---|---|
| Travail | Squat barre | 4 | 6–8 | 150s |
| Travail | Soulevé de terre jambes tendues | 3 | 8–10 | 90s |
| Travail | Presse à cuisses | 3 | 10–12 | 90s |
| Travail | Extensions quadriceps | 3 | 12–15 | 60s |
| Travail | Leg curl couché | 3 | 12–15 | 60s |
| Travail | Mollets debout | 4 | 15–20 | 60s |

---

## Data Model TypeScript

```ts
// app/data/templates.ts

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

type WorkoutTemplate = {
  name: string;
  blocks: BlockTemplate[];
};

export type TemplateDefinition = {
  id: string;
  name: string;
  level: 'débutant' | 'intermédiaire' | 'avancé';
  frequency: string;
  description: string;
  workouts: WorkoutTemplate[];
};

export const TEMPLATES: TemplateDefinition[] = [ /* 5 templates */ ];
```

---

## TemplateService

```ts
// app/services/TemplateService.ts

export async function importTemplate(
  db: SQLiteDatabase,
  templateId: string,
  programName: string,
  programRepo: IProgramRepository,
  workoutRepo: IWorkoutRepository,
  blockRepo: IBlockRepository,
  setRepo: ISetRepository,
): Promise<number>; // returns new program ID

// Pure function — pas de DB, utilise les programmes déjà chargés
export function isTemplateImported(
  programs: Program[],
  templateId: string,
): boolean;
```

**importTemplate flow :**
1. `SELECT id, name FROM exercises` → `Map<string, number>` (nom → id)
2. Vérifie que tous les exercices du template sont présents (throw si manquant)
3. `programRepo.save({ name: programName, is_active: 0, template_id: templateId, description: null, created_at: ... })`
4. Pour chaque workout : `workoutRepo.save(...)` → pour chaque block : `blockRepo.save(...)` → pour chaque set : `setRepo.save(...)`
5. Retourne `programId`

---

## UI Flow

### `app/app/_layout.tsx`
Wrapper racine dans `<GestureHandlerRootView style={{ flex: 1 }}>`.

### `app/app/(tabs)/programmes.tsx`
FAB `onPress` → `setBottomSheetOpen(true)` (état local). Render `<AddProgrammeBottomSheet>` en overlay.

### `app/components/programmes/AddProgrammeBottomSheet.tsx`
- `@gorhom/bottom-sheet` avec snap point `['35%']`
- Deux options :
  - "Créer un programme vide" → `router.push('/add-programme')`
  - "Importer un template" → `router.push('/import-template')`
- Backdrop tap ferme la sheet

### `app/app/import-template.tsx`
- Liste des 5 templates (cards) : nom, niveau, fréquence
- Tap card → state local `selectedTemplate`
- Affiche input nom (pré-rempli avec `template.name`, modifiable)
- Si `isTemplateImported(db, template.id)` → bandeau warning : `"Ce template a déjà été importé. Tu peux donner un nom différent à ce programme pour mieux t'y retrouver."`
- Bouton "Importer" → `importTemplate(...)` → `router.back()` + `refresh()`

---

## File Map

| Fichier | Action | Rôle |
|---|---|---|
| `app/db/schema.ts` | Modifier | Migration v7 : `template_id TEXT` sur `programmes` |
| `app/db/types.ts` | Modifier | Ajouter `template_id: string \| null` sur `Program` |
| `app/db/seeds.ts` | Modifier | 7 nouveaux exercices |
| `app/data/templates.ts` | Créer | 5 définitions de templates TypeScript |
| `app/services/TemplateService.ts` | Créer | `importTemplate`, `isTemplateImported` |
| `app/services/TemplateService.test.ts` | Créer | Tests unitaires |
| `app/components/programmes/AddProgrammeBottomSheet.tsx` | Créer | BottomSheet 2 choix |
| `app/app/import-template.tsx` | Créer | Écran import template |
| `app/app/(tabs)/programmes.tsx` | Modifier | FAB → BottomSheet |
| `app/app/_layout.tsx` | Modifier | GestureHandlerRootView |

---

## Tests

`TemplateService.test.ts` — tests avec InMemory repos :
1. `importTemplate` crée un programme avec le bon `template_id`
2. `importTemplate` crée le bon nombre de workouts
3. `importTemplate` crée les sets avec les bonnes valeurs (reps, rest)
4. `importTemplate` throw si un exercice est manquant en DB
5. `isTemplateImported([programWithTemplateId], 'full-body-3j')` retourne `true`
6. `isTemplateImported([], 'full-body-3j')` retourne `false`

---

## IProgramRepository — évolution

`IProgramRepository.create()` doit accepter `template_id?: string | null`. Modifier `CreateProgramDto` et les implémentations `SQLiteProgramRepository` + `InMemoryProgramRepository`.
