# Spec — Volume par groupe musculaire

**Date :** 2026-06-13
**Statut :** Approuvé

---

## Contexte

L'onglet Progression > Stats affiche déjà le volume hebdomadaire total (VolumeBarChart). On ajoute une section "Volume par stimulus" qui décompose ce volume en macro-catégories musculaires (Push / Pull / Jambes / Gainage) sur 4 semaines glissantes, avec un détail expandable par muscle.

Objectif : détecter les déséquilibres push/pull sur la durée (ex : trop de poitrine, pas assez de dos).

---

## Design

### 1. Mapping muscle → catégorie

Fichier `app/services/muscleGroupUtils.ts`. Mapping fixe des strings `muscle_groups` de la DB (format JSON array). Muscle inconnu → `'Autre'`.

| Catégorie | Muscles |
|---|---|
| Push | pectoraux, pectoraux supérieurs, triceps, deltoïdes antérieurs, deltoïdes |
| Pull | grand dorsal, biceps, brachial, rhomboïdes, trapèzes, deltoïdes postérieurs, rotateurs externes |
| Jambes | ischio-jambiers, fessiers, quadriceps, gastrocnémiens, soléaires |
| Gainage | abdominaux, érecteurs du rachis, fléchisseurs de hanche |

### 2. Règle d'attribution

Pour chaque `set_log` (volume = `reps_done × weight_done`) :
- Muscles de l'exercice parsés depuis `exercise.muscle_groups` (JSON)
- Volume ajouté **une seule fois par catégorie distincte** — Bench Press (pectoraux + triceps + deltoïdes antérieurs) ajoute au Push une seule fois
- Volume ajouté à chaque muscle individuellement (pour le détail expandable)

Conséquence intentionnelle : la somme des catégories ≠ volume total affiché dans VolumeBarChart (métrique différente : stimulus musculaire vs tonnage total). La section porte le titre "VOLUME PAR STIMULUS" pour éviter la confusion.

### 3. Fenêtre temporelle

4 semaines glissantes depuis lundi de la semaine courante — même fenêtre que `getVolumeByWeek` existant.

### 4. Types retournés

```typescript
export type MacroCategory = 'Push' | 'Pull' | 'Jambes' | 'Gainage' | 'Autre';

export interface MuscleDetail {
  muscle: string;  // nom brut de la DB
  volume: number;  // toujours en kg (conversion via useUnits côté UI)
}

export interface MacroGroupVolume {
  category: MacroCategory;
  volume: number;      // kg
  percentage: number;  // % du total catégories (arrondi entier)
  muscles: MuscleDetail[];  // triés par volume DESC
}
```

Résultats dans l'ordre Push → Pull → Jambes → Gainage → Autre. Catégories sans volume exclues.

### 5. UI

Nouvelle card dans l'onglet Stats (progression.tsx), **après** `VolumeBarChart`, **avant** PRs récents.

```
┌─ VOLUME PAR STIMULUS ─────────────────────────────────┐
│ Push   ████████████░░░░  45%   12 340 kg          ▼   │  ← tap → expand
│   · Pectoraux              8 200 kg                    │
│   · Triceps                3 100 kg                    │
│   · Deltoïdes ant.         1 040 kg                    │
│ Pull   ██████░░░░░░░░░░  28%    7 680 kg          ▶   │
│ Jambes ████░░░░░░░░░░░░  20%    5 480 kg          ▶   │
│ Gainage██░░░░░░░░░░░░░░   7%    1 920 kg          ▶   │
└───────────────────────────────────────────────────────┘
```

- Barre de progression : inner View avec `width: '${percentage}%'`
- Expand/collapse : `useState<Set<MacroCategory>>` local dans le composant
- `accessibilityState={{ expanded }}` sur chaque ligne catégorie
- Muscles triés par volume DESC
- Catégorie `'Autre'` affichée seulement si volume > 0
- Composant retourne `null` si `data.length === 0`
- Volumes affichés via `useUnits` (kg ou lbs selon réglages)

---

## Architecture

| Fichier | Action |
|---|---|
| `app/services/muscleGroupUtils.ts` | Créer — types, `MUSCLE_CATEGORY_MAP`, `getMacroCategory`, `computeVolumeByMuscleGroup` |
| `app/services/muscleGroupUtils.test.ts` | Créer — TDD 9 tests |
| `app/services/ProgressionService.ts` | Ajouter `getVolumeByMuscleGroup(now?)` |
| `app/services/ProgressionService.test.ts` | 2 nouveaux tests |
| `app/hooks/useProgression.ts` | Ajouter `volumeByMuscleGroup: MacroGroupVolume[]` |
| `app/components/progression/MuscleGroupCard.tsx` | Créer — card expandable |
| `app/app/(tabs)/progression.tsx` | Insérer `<MuscleGroupCard>` après `<VolumeBarChart>` |

---

## Hors scope

- Historique temporel de la répartition par catégorie (stacked chart par semaine)
- Configuration du mapping muscle → catégorie (UI ou DB)
- Alertes automatiques en cas de déséquilibre
- Filtre par programme ou workout
