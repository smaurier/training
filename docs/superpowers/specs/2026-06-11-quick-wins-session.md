# Quick Wins Séance — Design Spec

**Date :** 2026-06-11  
**Scope :** 4 améliorations RunningPhase — célébration PR, feedback reps, RPE redesign, redéfinition poids

---

## F1 — Célébration PR in-session

### Problème
Les PRs sont détectés en `SessionService.logSet` mais le résultat n'est jamais remonté à l'UI. L'utilisateur ne sait qu'en SummaryPhase qu'il a battu un record.

### Changements

**`SessionService.logSet`** — retourne `{ setLog: SetLog; isPR: boolean }` au lieu de `SetLog`.  
`isPR = true` si `estimated1RM > currentBest.estimated_1rm` (ou si aucun record existant et `weightDone > 0 && repsDone > 0`).

**`useSession`** — ajoute `lastPRExerciseName: string | null` :
- Mis à jour après chaque `validateSet` si `isPR === true`
- Cleared automatiquement après 3000ms (via `setTimeout` dans `validateSet`)
- Timeout ref stockée dans `useRef` pour cleanup sur unmount (évite state update sur composant démonté)
- Exposé dans le return de `useSession`

**`[workoutId].tsx`** — badge overlay absolu :
- Rendu si `session.lastPRExerciseName !== null`
- Position : haut de l'écran, centré, au-dessus de tout (zIndex élevé)
- Contenu : `🏆 Nouveau PR !` + nom de l'exercice (1 ligne, tronqué)
- Non-bloquant (pas d'action requise, pas de `pointerEvents: 'none'`)
- `AccessibilityInfo.announceForAccessibility("Nouveau record personnel !")` déclenché au moment du set

**Accessibilité :** annonce VoiceOver/TalkBack + badge visible (contraste suffisant sur fond sombre/clair).

### Tests
- `SessionService.logSet` — retourne `isPR: true` quand 1RM dépasse le record
- `SessionService.logSet` — retourne `isPR: false` quand 1RM inférieur
- `SessionService.logSet` — retourne `isPR: true` quand aucun record existant (premier log)
- `SessionService.logSet` — retourne `isPR: false` si `weightDone === 0` ou `repsDone === 0`
- Tests `useSession` existants : adapter les mocks pour le nouveau type de retour

---

## F2 — Feedback écart reps

### Problème
L'utilisateur fait 10 reps sur une cible de 5 — l'app ne réagit pas. Opportunité manquée de guider la progression.

### Changements

**`RunningPhase`** — valeur dérivée `repsFeedback: string | null`, recalculée à chaque changement du state `reps` :

```
const parsedReps = parseInt(reps, 10);
const isWeighted = set.weight_type !== 'bodyweight';

if (!isNaN(parsedReps) && isWeighted) {
  if (parsedReps > set.reps_max * 1.25)
    → "Tu dépasses la cible — envisage d'augmenter le poids."
  else if (parsedReps < set.reps_min * 0.75)
    → "Tu es en dessous de la cible — le poids est peut-être trop lourd."
  else
    → null
}
```

Seuil : ±25% par rapport à la plage cible (`reps_max * 1.25` / `reps_min * 0.75`).  
Affiché sous le bouton Valider, `fontSize: 13`, couleur `colors.textSecondary`.  
Pas de bordure, pas d'icône — texte discret, informatif.

### Tests
- Logique pure — unit test de la fonction de calcul (fichier utilitaire `repsFeedback.ts`)
- `parsedReps > reps_max * 1.25` → message "dépasse"
- `parsedReps < reps_min * 0.75` → message "en dessous"
- Dans la plage → `null`
- `weight_type === 'bodyweight'` → toujours `null`
- `reps` vide ou non-numérique → `null`

---

## F3 — RPE redesign

### Problème
`TextInput` libre pour RPE → friction, jamais utilisé. Saisie numérique inadaptée pendant une séance (clavier, une main).

### Changements

**`RunningPhase`** — remplacer le `TextInput` RPE par 3 chips horizontaux :

| Label | Valeur RPE |
|-------|-----------|
| Facile | 3 |
| Normal | 6 |
| Difficile | 9 |

State : `rpe` reste `string` mais les valeurs sont `'3' | '6' | '9' | ''` (aucun sélectionné = `''` → `null` dans `handleValidate`).

**Layout :** row de 3 `PressableA11y`, flex, hauteur 44pt minimum.  
Chip sélectionné → `backgroundColor: colors.primary`, texte `#fff`.  
Chip non sélectionné → `backgroundColor: colors.surface`, bordure `colors.border`.  
Tap sur chip déjà sélectionné → désélectionne (retour à `''`).

**Label section :** `RESSENTI (OPTIONNEL)` remplace `RPE (1–10)`.

**Accessibilité :**
- `accessibilityRole="radio"` sur chaque chip
- `accessibilityState={{ checked: rpe === chip.value }}`
- `accessibilityLabel` : `"Ressenti : Facile"`, `"Ressenti : Normal"`, `"Ressenti : Difficile"`

### Tests
- Composant RPE selector (si extrait) : sélection, désélection, état initial vide
- `handleValidate` : `rpe = ''` → `rpe: null` dans `SetActual`
- `handleValidate` : `rpe = '6'` → `rpe: 6` dans `SetActual`

---

## F4 — Redéfinir poids en cours de séance

### Problème
L'utilisateur réalise pendant la séance que le poids de départ est trop léger (ou trop lourd). Pas de moyen d'ajuster sans quitter la séance.

### Comportement
- S'applique aux séries **suivantes** uniquement. Le set en cours n'est pas modifié.
- Message discret après confirmation : `"Poids mis à jour pour les séries suivantes"` (visible 2s dans la zone restSets).
- Persistence en DB via `SessionService.setStartingWeight` (déjà implémenté).

### Changements

**`RunningPhase`** — nouveau prop `onAdjustWeight?: (kg: number) => Promise<void>`.  
Bouton dans `headerActions` : icône `barbell-outline`, visible si `set.weight_type !== 'bodyweight'`.

**BottomSheet stepper** (`adjustWeightSheetRef`) :
- State local : `adjustedWeight: number` — initialisé depuis `set.weight ?? 0`, affiché via `convert()`
- Incrément : `unitResolved === 'lbs' ? 5 : 2.5`
- Boutons `−` et `+` : taille 48pt minimum, zones tactiles confortables
- Valeur centrale pressable : tap → `TextInput` inline (clavier décimal) pour saisie directe
- Minimum : `0` (ne peut pas descendre sous 0)
- Confirm → `onAdjustWeight(kg)` → ferme sheet → affiche message 2s
- Annuler → ferme sheet sans changement

**`[workoutId].tsx`** — passe `onAdjustWeight={session.setStartingWeight}` à `RunningPhase`.

**Accessibilité :**
- Bouton `−` : `accessibilityLabel="Diminuer le poids de 2,5 kg"` (ou 5 lbs)
- Bouton `+` : `accessibilityLabel="Augmenter le poids de 2,5 kg"`
- Valeur : `accessibilityValue={{ text: \`${convert(adjustedWeight)} ${unitLabel}\` }}`

### Tests
- `onAdjustWeight` appelé avec la valeur kg correcte (conversion lbs→kg si nécessaire)
- Incrément adapté à l'unité
- Valeur ne descend pas sous 0

---

## Ordre d'implémentation

1. **F3** — RPE chips (pur UI, zéro dépendance)
2. **F2** — Feedback reps (pur UI, fonction utilitaire)
3. **F1** — PR badge (SessionService API change + overlay)
4. **F4** — Stepper poids (nouveau BottomSheet + prop)

---

## Fichiers touchés

| Fichier | Action |
|---------|--------|
| `services/SessionService.ts` | Modifier `logSet` return type |
| `services/SessionService.test.ts` | Adapter + ajouter tests `isPR` |
| `hooks/useSession.ts` | Ajouter `lastPRExerciseName` + cleared timeout |
| `app/session/[workoutId].tsx` | Badge overlay PR + prop `onAdjustWeight` |
| `components/session/RunningPhase.tsx` | F2 + F3 + F4 (prop + BottomSheet + chips) |
| `services/repsFeedback.ts` | Nouvelle fonction pure (F2) |
| `services/repsFeedback.test.ts` | Tests unitaires (F2) |
