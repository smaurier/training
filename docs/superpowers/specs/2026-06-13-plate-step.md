# Spec — `plate_step` configurable

**Date :** 2026-06-13
**Statut :** Approuvé

---

## Contexte

`applyDeload` et `computeWarmupSets` arrondissent les poids calculés à la rondelle la plus proche. Cet incrément est actuellement hardcodé à 2 kg dans les deux fonctions. Certains utilisateurs ont des rondelles de 1 kg, 1,25 kg, 2,5 kg ou 5 kg.

---

## Design

### 1. Stockage

- **Clé settings :** `'plate_step'`
- **Valeurs possibles (toujours en kg) :** `'1' | '1.25' | '2' | '2.5' | '5'`
- **Défaut si clé absente :** `2` (comportement actuel inchangé)

### 2. UI — Réglages

Nouvelle section `PROGRESSION` entre `DÉCHARGE AUTOMATIQUE` et `DONNÉES`.

Contenu de la card :

```
Incrément de rondelle
Poids minimum à ajouter ou retirer à la barre
[  1 kg  |  2 kg  |  2,5 kg  |  5 kg  ]   ← si resolved unit = kg
[  2,5 lbs  |  5 lbs  |  10 lbs  ]         ← si resolved unit = lbs
```

Options affichées selon `resolvedUnits` (depuis `useUnits()`) :

| Résolu | Options affichées | Valeur stockée (kg) |
|---|---|---|
| `kg` | 1 kg / 2 kg / 2,5 kg / 5 kg | `'1'` / `'2'` / `'2.5'` / `'5'` |
| `lbs` | 2,5 lbs / 5 lbs / 10 lbs | `'1.25'` / `'2.5'` / `'5'` |

Correspondance lbs → kg interne :
- 2,5 lbs ≈ 1,13 kg → 1,25 kg (rondelle courante la plus proche)
- 5 lbs ≈ 2,27 kg → 2,5 kg
- 10 lbs ≈ 4,54 kg → 5 kg

Approximation < 5% — sans impact pratique pour des arrondis de rondelles.

Le `SegmentedControl` existant est réutilisé tel quel (même composant que Thème/Unités/Décharge).

### 3. Fonction utilitaire

Dans `app/services/settingsUtils.ts` :

```typescript
export function getPlateStep(stored: string | null): number {
  const n = parseFloat(stored ?? '');
  return [1, 1.25, 2, 2.5, 5].includes(n) ? n : 2;
}
```

### 4. Fonctions pures modifiées

#### `app/services/progression.ts`

```typescript
// Avant
export function applyDeload(weight: number): number {
  return Math.floor((weight * 0.9) / 2) * 2;
}

// Après
export function applyDeload(weight: number, plateStep: number = 2): number {
  return Math.floor((weight * 0.9) / plateStep) * plateStep;
}
```

#### `app/services/warmup.ts`

```typescript
// Avant
export function computeWarmupSets(workWeight: number): WarmupSet[] {
  const round2 = (w: number) => Math.floor(w / 2) * 2;
  ...
}

// Après
export function computeWarmupSets(workWeight: number, plateStep: number = 2): WarmupSet[] {
  const roundPlate = (w: number) => Math.floor(w / plateStep) * plateStep;
  return [
    { weight: roundPlate(workWeight * 0.4), reps: 8, rest: 60, percent: 40 },
    { weight: roundPlate(workWeight * 0.6), reps: 5, rest: 60, percent: 60 },
    { weight: roundPlate(workWeight * 0.8), reps: 2, rest: 90, percent: 80 },
  ];
}
```

#### `app/services/DeloadService.ts` — `applyDeloadToExercises`

```typescript
// Avant
export function applyDeloadToExercises(exercises: ResolvedExercise[]): ResolvedExercise[]

// Après
export function applyDeloadToExercises(exercises: ResolvedExercise[], plateStep: number = 2): ResolvedExercise[]
// Passe plateStep à applyDeload(set.weight, plateStep)
```

#### `app/services/SessionService.ts` — `calculateProgressions`

```typescript
// Avant
async calculateProgressions(sessionLogId: number): Promise<ProgressionResult[]>

// Après
async calculateProgressions(sessionLogId: number, plateStep: number = 2): Promise<ProgressionResult[]>
// Passe plateStep aux appels applyDeload(oldWeight, plateStep)
```

### 5. Composant WarmupPhase

```typescript
// app/components/session/WarmupPhase.tsx
interface WarmupPhaseProps {
  exerciseName: string;
  workWeight: number;
  plateStep?: number;   // ← ajout, défaut 2
  onStart: () => void;
}
// computeWarmupSets(workWeight, plateStep ?? 2)
```

### 6. Flux de données — `[workoutId].tsx`

```typescript
// Lire au mount (comme deload_weeks)
const [plateStep, setPlateStep] = useState<number>(2);
useEffect(() => {
  const repo = new SQLiteSettingsRepository(getDb());
  repo.get('plate_step').then(v => setPlateStep(getPlateStep(v))).catch(console.error);
}, []);

// Passer à useSession
const session = useSession(workoutId, deloadedExercises, initialSession, plateStep);

// Passer à applyDeloadToExercises (useMemo — ajouter plateStep aux deps)
const deloadedExercises = useMemo(
  () => isDeloadSession ? applyDeloadToExercises(resolvedExercises, plateStep) : resolvedExercises,
  [isDeloadSession, resolvedExercises, plateStep],
);

// Passer à WarmupPhase
<WarmupPhase
  exerciseName={...}
  workWeight={session.warmupWorkWeight}
  plateStep={plateStep}
  onStart={session.confirmWarmup}
/>
```

### 7. `useSession.ts`

```typescript
// Avant
export function useSession(workoutId: number, exercises: ResolvedExercise[], initialSession?: InitialSession)

// Après
export function useSession(workoutId: number, exercises: ResolvedExercise[], initialSession?: InitialSession, plateStep: number = 2)
// Passe plateStep aux 3 appels service.calculateProgressions(sessionLogId, plateStep)
```

---

## Tests

### `settingsUtils.test.ts`
- `getPlateStep(null)` → `2`
- `getPlateStep('2.5')` → `2.5`
- `getPlateStep('1.25')` → `1.25`
- `getPlateStep('invalid')` → `2`

### `progression.test.ts` — `applyDeload`
- `applyDeload(60, 2.5)` → `54` (60×0.9=54, floor(54/2.5)×2.5 = 54)
- `applyDeload(65, 5)` → `55` (65×0.9=58.5, floor(58.5/5)×5 = 55)
- `applyDeload(100, 1.25)` → `90` (100×0.9=90, floor(90/1.25)×1.25 = 90)
- Tests existants sans 2e param passent inchangés (défaut 2)

### `warmup.test.ts` — `computeWarmupSets`
- `computeWarmupSets(100, 2.5)` → poids arrondis à 2.5 kg
- Tests existants sans 2e param passent inchangés (défaut 2)

---

## Architecture

| Fichier | Action |
|---|---|
| `app/services/settingsUtils.ts` | Ajouter `getPlateStep()` |
| `app/services/progression.ts` | `applyDeload` — param `plateStep = 2` |
| `app/services/warmup.ts` | `computeWarmupSets` — param `plateStep = 2`, renommer `round2` → `roundPlate` |
| `app/services/DeloadService.ts` | `applyDeloadToExercises` — param `plateStep = 2` |
| `app/services/SessionService.ts` | `calculateProgressions` — param `plateStep = 2` |
| `app/components/session/WarmupPhase.tsx` | Prop `plateStep?: number` |
| `app/hooks/useSession.ts` | Param `plateStep = 2`, passer aux 3 appels `calculateProgressions` |
| `app/app/session/[workoutId].tsx` | State `plateStep`, read settings au mount, passer partout |
| `app/app/(tabs)/reglages.tsx` | Section PROGRESSION + SegmentedControl |

---

## Hors scope

- Conversion dynamique si l'utilisateur change les unités en cours de session
- Options lbs ultra-fines (1,25 lbs / micro-rondelles)
- plate_step différent par exercice
