# Pack A — Séance : Annuler série + Humeur + Micro-copy

**Date :** 2026-06-13
**Statut :** Approuvé

---

## 1. Annuler la dernière série

### Contexte

`canUndo: boolean` et `undoLastSet()` existent déjà dans `useSession`. L'action supprime le dernier `set_log` et revient à la position précédente. Deux affordances manquent : le bouton header n'est pas conditionnel à `canUndo`, et le swipe sur la dernière série n'existe pas.

### Design

**A. Bouton header (RunningPhase)**
- Icône `arrow-undo-outline` dans le header, même rang que les icônes barbell (`modify weight`) et `?` (description).
- Visible uniquement quand `canUndo === true` — masqué sinon (pas de disabled, juste absent).
- `accessibilityLabel="Annuler la dernière série"`.
- Tap → `onUndo()` callback (déjà câblé ou à vérifier).

**B. Swipe sur la ligne lastSetLog (RunningPhase)**
- La ligne affichant `lastSetLog` (dernière série loggée : poids × reps) est wrappée dans un composant `Swipeable` de `react-native-gesture-handler`.
- Swipe gauche → action rouge "Annuler" révélée.
- Tap sur l'action → `undoLastSet()`.
- `Swipeable` configuré : `rightThreshold={40}`, `overshootRight={false}` pour éviter conflit avec ScrollView parent.
- Visible uniquement quand `lastSetLog` est non-null (= au moins une série validée).

**Contrainte implémentation :** vérifier que `Swipeable` dans un `ScrollView` ne génère pas de friction (swipe horizontal vs scroll vertical). Si conflit : supprimer le swipe, conserver uniquement le bouton header.

### Architecture

| Fichier | Action |
|---|---|
| `components/session/RunningPhase.tsx` | Conditionner bouton undo sur `canUndo`, wrapper `lastSetLog` dans `Swipeable` |

Aucune modification `useSession` — `undoLastSet` et `canUndo` existent.

---

## 2. Humeur après séance

### Contexte

`session_logs` contient déjà `checkin_energy/fatigue/sleep` pour le ressenti avant séance. `mood_after` est le pendant post-séance. Collecte scientifiquement pertinente (Teixeira et al. — ressenti post-séance prédicteur d'adhérence). Pas d'affichage en V1 — data seulement.

### Design

**Migration v10**
```sql
ALTER TABLE session_logs ADD COLUMN mood_after INTEGER CHECK(mood_after BETWEEN 1 AND 3);
```
Nullable. Pas de valeur par défaut. Ne casse aucune séance existante.

**SummaryPhase — section humeur**
- Section optionnelle juste avant le bouton "Retour au programme".
- Titre : `"Comment tu te sens ?"` (factuel, pas évaluatif).
- 3 chips horizontaux : `😓 Épuisé` (1) · `😌 Bien` (2) · `⚡ En forme` (3).
- Tap = sélection visuelle + persistance immédiate via `SessionService.saveMoodAfter(sessionLogId, mood)`.
- Sélection optionnelle — fermer sans choisir = `mood_after NULL`.
- Pas de validation, pas de confirmation.

**Props SummaryPhase**
```typescript
onMoodSelect?: (mood: 1 | 2 | 3) => void;
selectedMood?: 1 | 2 | 3;
```

**State**
`selectedMood` vit en local dans `[workoutId].tsx` — pas dans `useSession`.

### Architecture

| Fichier | Action |
|---|---|
| `app/db/schema.ts` | Migration v10 — ADD COLUMN mood_after |
| `app/services/SessionService.ts` | Méthode `saveMoodAfter(sessionLogId: number, mood: 1 \| 2 \| 3): Promise<void>` — UPDATE session_logs |
| `app/services/SessionService.test.ts` | TDD `saveMoodAfter` |
| `app/components/session/SummaryPhase.tsx` | Section humeur + props `onMoodSelect` + `selectedMood` |
| `app/app/session/[workoutId].tsx` | State `selectedMood`, handler `handleMoodSelect`, câblage SummaryPhase |

---

## 3. Micro-copy audit

### Principe
Appliquer le filtre de décision du spec philosophie (`docs/superpowers/specs/2026-06-12-philosophie-entrainement-sain.md`) à toutes les strings visibles. Les corrections ci-dessous sont les seules violations identifiées.

### Corrections

| Fichier | Avant | Après | Raison |
|---|---|---|---|
| `components/session/RestPhase.tsx:29` | `"C'EST PARTI !"` | `"À toi ·"` | Moins agressif, spec validé |
| `components/session/RestPhase.tsx:39` | `"C'EST PARTI"` (label CircularTimer) | `"À toi"` | Cohérence |
| `components/session/RestPhase.tsx:50` | `"C'est parti, continuer la séance"` (a11y) | `"À toi — continuer la séance"` | Cohérence |
| `components/session/RestPhase.tsx:65` | `"C'est parti →"` | `"À toi →"` | Cohérence |
| `app/session/[workoutId].tsx:364` | `"Nouveau PR !"` | `"✦ Nouvelle meilleure marque"` | PR = compétitif, spec validé |
| `app/session/[workoutId].tsx:232` | `"Nouveau record personnel !"` (a11y announce) | `"Nouvelle meilleure marque !"` | Cohérence |
| `app/progression/[exerciseId].tsx:115` | `"MEILLEUR PR"` | `"MEILLEURE MARQUE"` | PR = compétitif |
| `app/(tabs)/progression.tsx:137` | `'PRs'` | `'MARQUES'` | PR = compétitif |
| `app/(tabs)/index.tsx:27` | `"Jamais faite"` | `"Nouvelle"` | Highlight absence → signal positif |
| `app/(tabs)/index.tsx:76` | `"Aucune série complétée"` | `"Interrompue"` | Factuel neutre |

### Inchangé (confirmé conforme)
`"Valider"`, `"Passer"`, `"Progression"`, `"REPOS"`, `"Séances"`, `"Exercices"`, `"RPE"`, `"Déload"`, `"Facile/Normal/Difficile"` — listés explicitement comme termes neutres dans le spec philosophie.

---

## Hors scope

- Swipe edit d'une série arbitraire (pas seulement la dernière) → V3
- Affichage de `mood_after` dans l'historique → V2 analytics
- Supersets → feature dédiée
- Audit WCAG / accessibilité complet → session dédiée
