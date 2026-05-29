# Tests manuels MVP — Training App

> **À exécuter quand le MVP est finalisé.** Ce fichier évolue à chaque session de développement.
> Cocher chaque case lors de la passe de validation finale.

---

## Prérequis

- App lancée sur device/émulateur Android (ou iOS)
- Base de données vierge (ou reset via `npm run android` fresh install)
- Vérifier qu'aucune erreur rouge n'apparaît au lancement

---

## 1. Onboarding / Accueil

### 1A — Aucun programme actif

- [ ] Accueil affiche "Aucun programme actif"
- [ ] Lien "Créer un programme →" navigue vers l'onglet Programmes
- [ ] Pas de crash, pas d'écran blanc

### 1B — Programme actif sans séances

- [ ] Accueil affiche "Aucune séance configurée"

### 1C — Programme actif avec séances

- [ ] Accueil affiche la carte "PROCHAINE SÉANCE" avec le nom de la séance
- [ ] Bouton "Démarrer" visible et fonctionnel

---

## 2. Programmes

### 2A — Création

- [ ] Créer un programme (nom requis)
- [ ] Programme apparaît dans la liste
- [ ] Programme désactivé par défaut (`is_active = 0`)

### 2B — Activation

- [ ] Activer un programme → badge "actif" visible
- [ ] Un seul programme actif à la fois (activation désactive le précédent)

### 2C — Modification / suppression

- [ ] Modifier le nom d'un programme
- [ ] Supprimer un programme → disparaît de la liste
- [ ] Supprimer le programme actif → accueil repasse en "Aucun programme actif"

---

## 3. Séances (Workouts)

### 3A — Création

- [ ] Depuis un programme, créer une séance (nom requis)
- [ ] Séance apparaît dans la liste du programme

### 3B — Réordonnancement

- [ ] Boutons ↑/↓ réordonnent les séances
- [ ] L'ordre est persisté après navigation

### 3C — Suppression

- [ ] Supprimer une séance → disparaît
- [ ] La séquence circulaire (`getNextWorkout`) s'adapte correctement

---

## 4. Configuration séance (workout/[id])

### 4A — Ajout exercice

- [ ] Bouton + ouvre la recherche d'exercices
- [ ] Recherche filtre les résultats en temps réel
- [x] Résultats vides → bouton "Créer un exercice" visible
- [ ] Ajouter un exercice → apparaît dans la liste avec un bloc "Travail" par défaut

### 4B — Blocs

- [x] Badge TRAVAIL (bleu) / REPOS (gris) visible sur chaque bloc
- [x] Bloc unique → hint "Ajoute des blocs..." visible
- [x] Créer un bloc → chips suggestions (Échauffement, Travail, Back-off) affichées
- [x] Sélectionner une chip → pré-remplit nom et type is_work_block
- [ ] Réordonner blocs ↑/↓ → persisté

### 4C — Séries

- [ ] Ajouter une série à un bloc → apparaît avec valeurs par défaut
- [ ] Modifier reps/poids/rest_duration → persisté
- [ ] Réordonner séries ↑/↓ → persisté
- [ ] Supprimer une série

### 4D — Réordonnancement exercices

- [ ] Boutons ↑/↓ déplacent les exercices dans la liste
- [ ] Ordre persisté

### 4E — Bouton Démarrer

- [ ] Bouton vert "▶ Démarrer la séance" visible en bas (gauche du FAB)
- [ ] Navigation vers l'écran de session

---

## 5. Conduite de séance

### 5A — Check-in

- [ ] 3 lignes : Énergie / Fatigue / Sommeil
- [ ] Bouton "Commencer" désactivé tant que les 3 champs ne sont pas remplis
- [ ] Sélectionner les 3 → bouton s'active
- [ ] Tap "Commencer" → écran Running

### 5B — Phase Running — navigation

- [ ] Header : nom exercice + progression (ex : "1 / 3 exercices")
- [ ] Badge bloc (ex : TRAVAIL, ÉCHAUFFEMENT) affiché
- [ ] Cible affichée : "80 kg × 6–8 rép"
- [ ] Séries restantes du bloc affichées en bas (grisées)
- [ ] "Passer →" avance à la série suivante sans logger
- [ ] Dernière série → écran Summary

### 5C — Phase Running — timer

- [ ] Timer démarre automatiquement après chaque série validée
- [ ] Tap sur timer → pause
- [ ] Tap à nouveau → reprend
- [ ] Timer atteint 00:00 → s'arrête (pas de valeur négative)
- [ ] Changement de série → timer reset avec la `rest_duration` de la nouvelle série

### 5D — Validation série

- [ ] Champs Reps et Poids pré-remplis (reps_max, weight de la série)
- [ ] Champ RPE optionnel (vide = null)
- [ ] Poids non modifiable si `weight_type !== 'fixed'` (ex : bodyweight)
- [ ] "Valider" → avance à la série suivante, timer démarre
- [ ] "Tout réussi ⚡" → valide avec reps_max + weight cible, RPE null

### 5E — Retour arrière

- [ ] Bouton Back système n'interrompt pas la session (écran reste en état)
- [ ] Navigation dans l'app ne détruit pas la session en cours

### 5F — Séance vide / edge cases

- [ ] Séance avec 0 exercices → bouton Démarrer navigue, phase Running vide → passe directement en Summary
- [ ] Séance avec seulement des blocs non-travail → pas de progression calculée

---

## 6. Résumé de séance (Summary)

- [ ] "🎉 Séance terminée !" affiché
- [ ] Durée affichée (ex : "47 min")
- [ ] Nombre de séries loggées correct
- [ ] Nombre de progressions correct

### 6A — Progressions (seuil 1)

- [ ] Exercice avec seuil 1 : atteindre reps_max sur toutes séries travail → "80 → 82.5 kg" dans résumé
- [ ] Poids mis à jour dans la config séance (workout/[id]) après retour
- [ ] Exercice non atteint → "X/1 séances" affiché

### 6B — Progressions (seuil 2)

- [ ] Session 1 réussie → "1/2 séances" dans résumé, pas de progression
- [ ] Session 2 réussie → progression appliquée

### 6C — PR (Personal Record)

- [ ] Après logSet : vérifier en DB que `personal_records` contient un enregistrement
  *(pas encore affiché dans l'UI — à activer quand la page Progression sera développée)*

### 6D — Navigation retour

- [ ] "Retour au programme" → navigation arrière
- [ ] Accueil affiche la prochaine séance dans la séquence (circulaire)

---

## 7. Séquence circulaire (getNextWorkout)

- [ ] Programme Push / Pull / Legs : après Push → accueil affiche Pull
- [ ] Après Legs → accueil affiche Push (wrap-around)
- [ ] Programme avec 1 seule séance → toujours affiche la même

---

## 8. Thème

- [ ] Dark mode : pas de texte blanc sur fond blanc, pas de couleurs inversées
- [ ] Light mode : idem

---

## 9. Accessibilité (smoke test)

- [ ] Tous les boutons ont un label lisible par le lecteur d'écran (TalkBack / VoiceOver)
- [ ] Taille minimale touch target 44pt respectée sur les boutons principaux

---

## 10. Historique des séances

### 10A — Liste

- [ ] Onglet Progression affiche les séances passées groupées par mois
- [ ] En-tête de section : "Mai 2026 · N séances"
- [ ] Chaque item : nom séance, date, durée, nb séries
- [ ] Séance sans ended_at → durée affiche "--"
- [ ] Liste vide (aucune séance) → message "Aucune séance enregistrée"
- [ ] Après complétion d'une séance depuis l'onglet Séance → retour sur Progression → nouvelle séance visible

### 10B — Détail

- [ ] Tap sur une séance → écran détail
- [ ] Header : durée, nb séries, RPE moy. (si au moins un RPE saisi)
- [ ] Pas de RPE saisi → colonne RPE absente du header
- [ ] Check-in : énergie / fatigue / sommeil avec emojis corrects
- [ ] Exercices listés avec sets : "80 kg × 8 · RPE 7"
- [ ] Sets sans RPE → pas de "· RPE" dans le chip
- [ ] Séance avec ~10 exercices → scroll fluide sans freeze

---

## Sessions futures — à compléter

> Ces sections seront ajoutées au fil des prochaines sessions de développement.

- [ ] **Historique des séances** (Session 10)
- [ ] **Page Progression / graphiques** (Session 10)
- [ ] **Plate calculator** (V2)
- [ ] **Drag-and-drop reorder** (déjà implémenté en 8B — tester en contexte réel)

---

## 11. Progression Stats

- Onglet Progression → segment Stats → dashboard visible
- Stats globales : séances, PRs, exercices ce mois corrects
- Volume 4 semaines ISO : barres affichées, semaine courante en bleu
- PRs récents : 5 derniers PRs avec nom exercice et 1RM estimé
- Liste 1RM : exercices loggés avec valeur et delta
- Delta "Depuis le début" si moins de 30j de données
- Tap exercice → écran détail avec graphique barres par session
- Meilleur PR + historique PRs dans le détail
- Segment Historique → liste des séances toujours intacte

---

## 12. Trace — Refonte visuelle (session 12)

- [ ] Dark mode : fond #0D0D0D, surface #1A1A1A, texte blanc pur
- [ ] Light mode : fond #F5F5F5, surface #FFFFFF, texte #0D0D0D
- [ ] Tab bar : icône active = blanc (dark) / noir (light) ; icône inactive = grise
- [ ] Toutes les cartes et boutons : borderRadius 4px (Sharp)
- [ ] Police Inter visible sur tous les écrans (pas de system font / SF Pro)
- [ ] Splash screen : fond #0D0D0D
- [ ] Titre app "Trace" dans header natif
- [ ] Couleurs delta vert #22C55E / rouge #EF4444 inchangées (Progression)
- [ ] Segmented control Progression : shape Sharp, contraste correct dark/light

---

## Notes de passe

| Date | Version | Résultat | Remarques |
|------|---------|----------|-----------|
| — | MVP final | — | Première passe |
