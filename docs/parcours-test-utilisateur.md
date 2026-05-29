# Parcours test utilisateur — Trace MVP

> Effectue chaque étape dans l'ordre. Coche les cases au fur et à mesure. Signale chaque anomalie avec le contexte exact (écran, action, message d'erreur).

**Prérequis :** fresh install (`npm run android`), base de données vierge, aucune erreur rouge au lancement.

---

## Partie 1 — Mise en place du programme

### 1.1 Premier lancement

- [ ] L'accueil affiche "Aucun programme actif"
- [ ] Un lien / bouton "Créer un programme →" est visible
- [ ] Tap dessus → onglet Programmes s'ouvre
- [ ] Aucun crash, aucun écran blanc

### 1.2 Créer un premier programme

- [ ] Tap FAB (+) → formulaire de création s'ouvre
- [ ] Saisir un nom (ex : "Push Pull Legs") → valider
- [ ] Programme apparaît dans la liste
- [ ] Badge "actif" absent par défaut

### 1.3 Créer un deuxième programme

- [ ] Créer un 2e programme (ex : "Full Body")
- [ ] Les deux programmes sont visibles dans la liste
- [ ] Aucun n'est actif

### 1.4 Activer un programme

- [ ] Long-press sur "Push Pull Legs" → menu apparaît avec "Modifier / Activer / Supprimer / Annuler"
- [ ] Tap "Activer" → badge "actif" apparaît sur la carte
- [ ] Retour accueil → affiche "Aucune séance configurée" (programme actif mais sans séances)

### 1.5 Un seul programme actif à la fois

- [ ] Long-press sur "Full Body" → tap "Activer"
- [ ] "Full Body" devient actif, "Push Pull Legs" perd son badge
- [ ] Réactiver "Push Pull Legs" pour la suite

### 1.6 Modifier et supprimer

- [ ] Long-press → "Modifier" → changer le nom → sauvegarder → nom mis à jour
- [ ] Créer un 3e programme "Test" → long-press → "Supprimer" → confirmation → disparaît
- [ ] Supprimer le programme actif → accueil repasse en "Aucun programme actif"
- [ ] Réactiver "Push Pull Legs" avant de continuer

---

## Partie 2 — Configuration des séances

### 2.1 Créer les séances

Ouvrir le programme "Push Pull Legs".

- [ ] Tap FAB (+) → créer "Push"
- [ ] Créer "Pull"
- [ ] Créer "Legs"
- [ ] Les 3 séances apparaissent dans la liste

### 2.2 Réordonner les séances

- [ ] Flèche ↑ sur "Pull" → "Pull" passe avant "Push"
- [ ] Flèche ↓ sur "Pull" → revient à l'ordre initial
- [ ] L'ordre est persisté après navigation (quitter et revenir)
- [ ] La flèche ↑ est absente sur la 1re séance, ↓ absente sur la dernière

### 2.3 Configurer la séance Push

Tap sur "Push".

#### Ajouter des exercices

- [ ] Tap FAB (+) → écran de recherche s'ouvre
- [ ] Taper "bench" → résultats filtrés en temps réel
- [ ] Taper une chaîne sans résultat → message "Aucun exercice trouvé" + bouton "Créer un exercice"
- [ ] Tap "Créer un exercice" → navigue vers le formulaire de création
- [ ] Revenir, chercher "bench" → ajouter "Bench Press"
- [ ] Bench Press apparaît dans la liste avec un bloc "Travail" par défaut
- [ ] Ajouter aussi "Overhead Press" et "Tricep Pushdown"

#### Réordonner les exercices

- [ ] Flèche ↑/↓ sur Overhead Press → fonctionne
- [ ] Ordre persisté après navigation

#### Configurer les blocs de Bench Press

Tap sur la carte Bench Press pour l'étendre.

- [ ] Badge TRAVAIL (couleur primaire) visible sur le bloc existant
- [ ] Bloc unique → hint en italique "Ajoute des blocs pour structurer ta séance..."
- [ ] Tap "+" (ajouter bloc) → modal s'ouvre avec chips "Échauffement / Travail / Back-off"
- [ ] Tap chip "Échauffement" → nom pré-rempli "Échauffement", toggle is_work_block = REPOS
- [ ] Tap chip "Travail" → nom pré-rempli "Travail", toggle is_work_block = TRAVAIL
- [ ] Chip sélectionnée → fond légèrement teinté
- [ ] Sauvegarder → bloc ajouté, hint disparaît (2 blocs maintenant)
- [ ] Badge REPOS (gris) sur Échauffement, badge TRAVAIL sur Travail

#### Modifier les blocs

- [ ] Long-press sur un bloc → modal s'ouvre en mode édition
- [ ] Chips absentes en mode édition
- [ ] Renommer le bloc → sauvegardé

#### Réordonner les blocs

- [ ] Flèches ↑/↓ sur les blocs → fonctionne
- [ ] Ordre persisté

#### Configurer les séries du bloc Travail

Tap sur le bloc "Travail" pour l'étendre.

- [ ] Tap "+" → série ajoutée avec valeurs par défaut (reps, poids, repos)
- [ ] Modifier reps → sauvegardé
- [ ] Modifier poids → sauvegardé
- [ ] Modifier durée repos → sauvegardé
- [ ] Ajouter une 2e et 3e série
- [ ] Flèches ↑/↓ → réordonner les séries, persisté
- [ ] Supprimer une série → disparaît

---

## Partie 3 — Conduire une séance

### 3.1 Lancer la séance

- [ ] Retour accueil → carte "PROCHAINE SÉANCE : Push" visible
- [ ] Tap "Démarrer" → écran de session s'ouvre

### 3.2 Check-in

- [ ] 3 lignes : Énergie / Fatigue / Sommeil
- [ ] Bouton "Commencer" désactivé tant que les 3 ne sont pas sélectionnés
- [ ] Sélectionner les 3 → bouton s'active
- [ ] Tap "Commencer" → phase Running

### 3.3 Phase Running

- [ ] Header affiche le nom de l'exercice + progression ("1 / 3 exercices")
- [ ] Badge du bloc visible (ex : TRAVAIL, ÉCHAUFFEMENT)
- [ ] Cible affichée (ex : "80 kg × 6–8 rép")
- [ ] Séries restantes du bloc affichées en bas (grisées)

### 3.4 Valider une série

- [ ] Champs Reps et Poids pré-remplis avec les valeurs cible
- [ ] Modifier les reps → modifiable
- [ ] Champ RPE optionnel (laisser vide = null)
- [ ] Tap "Valider" → série loggée, timer démarre

### 3.5 Timer de repos

- [ ] Timer démarre automatiquement après validation
- [ ] Tap timer → pause
- [ ] Tap à nouveau → reprend
- [ ] Timer atteint 00:00 → s'arrête (pas de négatif)
- [ ] Série suivante → timer reset avec sa propre durée de repos

### 3.6 Bouton "Passer"

- [ ] Tap "Passer →" → avance sans logger
- [ ] La série passer n'apparaît pas dans le résumé final

### 3.7 Bouton "Tout réussi ⚡"

- [ ] Tap → valide avec reps_max + poids cible, RPE null
- [ ] Avance à la série suivante

### 3.8 Navigation arrière

- [ ] Bouton Back système → la session reste en cours (pas de reset)
- [ ] Naviguer dans l'app → session non détruite

### 3.9 Fin de séance

- [ ] Après la dernière série → écran Summary automatiquement

---

## Partie 4 — Résumé de séance

- [ ] "🎉 Séance terminée !" affiché
- [ ] Durée totale affichée
- [ ] Nombre de séries loggées correct
- [ ] Nombre de progressions affiché

### 4.1 Progression seuil 1

_(Prérequis : exercice avec `progression_threshold = 1`, avoir atteint reps_max sur toutes les séries travail)_

- [ ] "80 → 82.5 kg" (ou équivalent) affiché dans le résumé
- [ ] Retour sur workout/[id] → poids mis à jour dans la config

### 4.2 Progression seuil 2

_(Prérequis : exercice avec `progression_threshold = 2`)_

- [ ] Session 1 réussie → "1/2 séances" dans le résumé, pas de progression
- [ ] Session 2 réussie → progression appliquée

### 4.3 Retour accueil après séance

- [ ] "Retour au programme" → navigue en arrière
- [ ] Accueil affiche la prochaine séance dans la séquence (Pull après Push)
- [ ] Après Legs → repasse sur Push (wrap-around circulaire)

---

## Partie 5 — Historique et Progression

### 5.1 Historique des séances

Onglet Progression → segment Historique.

- [ ] Liste des séances passées groupées par mois
- [ ] En-tête de section : "Mai 2026 · N séances"
- [ ] Chaque item : nom séance, date, durée, nb séries
- [ ] Séance sans ended_at → durée affiche "--"
- [ ] Message "Aucune séance enregistrée" si liste vide

### 5.2 Détail d'une séance

Tap sur une séance dans la liste.

- [ ] Header : durée, nb séries, RPE moyen (si au moins un RPE saisi)
- [ ] Pas de RPE saisi → colonne RPE absente
- [ ] Check-in : énergie / fatigue / sommeil avec emojis
- [ ] Exercices listés avec sets : "80 kg × 8 · RPE 7"
- [ ] Sets sans RPE → pas de "· RPE"
- [ ] Séance avec plusieurs exercices → scroll fluide

### 5.3 Stats

Onglet Progression → segment Stats.

- [ ] Dashboard visible : séances, PRs, exercices ce mois
- [ ] Volume 4 semaines : barres affichées, semaine courante en bleu
- [ ] PRs récents : 5 derniers PRs avec nom exercice et 1RM estimé
- [ ] Liste 1RM : exercices loggés avec valeur et delta
- [ ] Tap exercice → écran détail avec graphique barres par session
- [ ] Meilleur PR + historique dans le détail

---

## Partie 6 — Visuel et accessibilité

### 6.1 Thème

- [ ] Dark mode : fond #0D0D0D, surface #1A1A1A, texte blanc pur
- [ ] Light mode : fond #F5F5F5, surface #FFFFFF, texte #0D0D0D
- [ ] Tab bar : icône active blanche (dark) / noire (light), inactive grise
- [ ] Toutes les cartes : borderRadius 4px (Sharp)
- [ ] Police Inter visible partout
- [ ] Couleurs delta Progression : vert #22C55E / rouge #EF4444 inchangées

### 6.2 Accessibilité (smoke test)

- [ ] Activer TalkBack (Android) ou VoiceOver (iOS)
- [ ] Tous les boutons ont un label lisible
- [ ] Touch targets principaux ≥ 44pt

---

## Partie 7 — Réglages (état actuel)

- [ ] Onglet Réglages s'ouvre sans crash
- [ ] Affiche un écran placeholder (icône + texte descriptif)
- [ ] Rien d'interactif — prévu V2

---

## Récapitulatif bugs / anomalies

| # | Écran | Action | Comportement observé | Sévérité |
|---|-------|--------|----------------------|----------|
| | | | | |

---

> Dernière mise à jour : 2026-05-29 (session 14)
