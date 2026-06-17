# Spec — Onboarding

**Date :** 2026-06-17  
**Statut :** À implémenter  
**Priorité :** Haute (premier item "fin de projet")

---

## Objectif

Wizard d'onboarding au premier lancement. Rapide (< 3 min) mais couvrant en profondeur le fonctionnement de l'app. Extensible pour les futures features backlog.

---

## Architecture

**Approche : wizard single-route** (`app/onboarding.tsx`)

- Un seul fichier route Expo Router
- State interne `step: number` + `wizardState: WizardState`
- Array `SCREENS` de configs avec skip conditions
- Composants isolés dans `components/onboarding/`

```ts
type WizardState = {
  objective: 'force' | 'hypertrophie' | 'maintien' | 'cardio' | null;
  selectedProgramId: number | null;
};

type ScreenConfig = {
  id: string;
  component: React.ComponentType<ScreenProps>;
  skip?: (state: WizardState, programs: Program[], isReview: boolean) => boolean;
};
```

**Ajout d'un écran futur** = ajouter un objet dans `SCREENS`. Zéro refacto.

---

## Déclenchement

### Premier lancement

`_layout.tsx` — après `dbReady` :

```ts
const done = await settingsRepo.get('onboarding_done');
if (!done) router.replace('/onboarding');
```

### "Revoir l'onboarding" (depuis Réglages)

```ts
router.push('/onboarding?review=true');
```

Le param `review=true` désactive toutes les skip conditions — tous les écrans sont affichés, `ProgramScreen` pré-sélectionne le programme actif.

### Completion

`ReadyScreen` → `settingsRepo.set('onboarding_done', 'true')` → `router.replace('/(tabs)')`.

Si mode review : `router.back()` (flag déjà posé, pas à re-écrire).

---

## Écrans (7)

| # | ID | Composant | Skip |
|---|-----|-----------|------|
| 0 | `philosophy` | `PhilosophyScreen` | Jamais |
| 1 | `objective` | `ObjectiveScreen` | Jamais |
| 2 | `program` | `ProgramScreen` | Si `programs.length > 0` ET pas review |
| 3 | `session-demo` | `SessionDemoScreen` | Jamais |
| 4 | `settings-intro` | `SettingsIntroScreen` | Jamais |
| 5 | `progression` | `ProgressionScreen` | Jamais |
| 6 | `ready` | `ReadyScreen` | Jamais |

### Écran 0 — Philosophy

Texte du manifeste : valeurs de l'app, philosophie "entraînement sérieux sans mécaniques toxiques". Pas d'interaction — bouton "Continuer" seul CTA.

Référence texte : `docs/superpowers/specs/2026-06-12-philosophie-entrainement-sain.md`

### Écran 1 — Objective

4 chips : **Force** / **Hypertrophie** / **Maintien** / **Cardio**. Sélection stockée dans `wizardState.objective` uniquement — pas de persistance DB. Utilisé pour pré-filtrer les templates à l'écran suivant.

### Écran 2 — Program

Liste de templates filtrée selon `wizardState.objective` (correspondance niveau/type). Sélectionner → importer via `importTemplate()` (flow existant `import-template.tsx`). 

Import inline via `TemplateService.importTemplate()` — **ne pas naviguer vers `/import-template`** (sortirait du wizard). Le composant instancie les repos nécessaires et appelle le service directement. `isTemplateImported(programs, id)` pour marquer les templates déjà importés.

Mode review : affiche tous les templates, programme actif pré-sélectionné visuellement (badge).

### Écran 3 — Session Demo (replica)

Composant autonome — **ne pas importer RunningPhase ou useSession**.

Séquence interactive :
1. Affiche nom exercice + cible (ex: "Développé couché — 3×8")
2. Champ reps tappable → utilisateur entre un nombre
3. Bouton "Valider" → animation de validation
4. Compte à rebours repos (5s accéléré pour la démo)
5. Série suivante → même flow

> ⚠️ **Maintenance** : ce composant est une replica simplifiée de `RunningPhase`. À vérifier et mettre à jour lors de chaque changement significatif de l'UI de séance (layout, CTA, timer).

### Écran 4 — Settings Intro

Présentation des 3 réglages clés à configurer :
- **Unités** (kg / lbs)
- **Pas de plaque** (2,5 kg recommandé)
- **Notifications** (rappel séance)

Composants `SegmentedControl` ou chips directement dans cet écran — les changements sont persistés immédiatement via `settingsRepo`. L'utilisateur ne doit pas aller dans Réglages pour configurer l'essentiel.

### Écran 5 — Progression

Aperçu statique de l'onglet Progression : montrer les sections "Présences", "Marques", historique exercice, objectifs. Texte expliquant que la progression se construit séance après séance. Pas interactif.

### Écran 6 — Ready

Résumé :
- Programme choisi (nom)
- Objectif sélectionné
- CTA "Commencer ma première séance →"

---

## Aide contextuelle dans Réglages

Section header de chaque bloc dans `reglages.tsx` reçoit une icône `(?)`.

Tap → texte d'explication inline expand/collapse (pas de modal, pas de navigation). Une ligne par section max.

Exemples :
- THÈME : "L'app s'adapte automatiquement à ton système ou tu choisis manuellement."
- PROGRESSION : "Le pas de plaque détermine l'incrément de poids à chaque progression."
- NOTIFICATIONS : "Un rappel hebdomadaire optionnel. Pas d'alerte d'absence ou de streak."

---

## Navigation dans le wizard

Barre de progression en haut (dots ou barre linéaire, hors Philosophy). Bouton "Retour" dès l'écran 1. Pas de swipe — navigation explicite uniquement.

Transition : `Animated.View` slide horizontal entre steps.

---

## Fichiers

### Nouveaux
```
app/app/onboarding.tsx
app/components/onboarding/PhilosophyScreen.tsx
app/components/onboarding/ObjectiveScreen.tsx
app/components/onboarding/ProgramScreen.tsx
app/components/onboarding/SessionDemoScreen.tsx
app/components/onboarding/SettingsIntroScreen.tsx
app/components/onboarding/ProgressionScreen.tsx
app/components/onboarding/ReadyScreen.tsx
```

### Modifiés
```
app/app/_layout.tsx        — check onboarding_done après dbReady
app/app/(tabs)/reglages.tsx — bouton "Revoir l'onboarding" + icônes aide (?)
```

---

## Tests

`shouldSkip(screen, wizardState, programs, isReview): boolean` — pure function, TDD.

Cas à couvrir :
- `program` skip si `programs.length > 0` ET `isReview = false`
- `program` affiché si `programs.length > 0` ET `isReview = true`
- `program` affiché si `programs.length === 0`
- Tous autres screens : jamais skip

Pas de tests pour les composants UI (visuels uniquement).

---

## Hors scope

- Deep link par step (`/onboarding?step=N`) — YAGNI
- Persistance de l'objectif wizard en DB — YAGNI
- Animation complexe type Lottie — garder simple
- Localisation i18n
