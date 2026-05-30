# Parcours test utilisateur — Trace MVP

> Effectue chaque étape dans l'ordre. Coche les cases au fur et à mesure. Signale chaque anomalie avec le contexte exact (écran, action, message d'erreur).

**Prérequis :** fresh install (`npm run android`), base de données vierge, aucune erreur rouge au lancement.

---

## Partie 1 — Mise en place du programme

### 1.1 Premier lancement

- [ok] L'accueil affiche "Aucun programme actif"
- [ok] Un lien / bouton "Créer un programme →" est visible
- [ok ] Tap dessus → onglet Programmes s'ouvre
- [ ok] Aucun crash, aucun écran blanc

### 1.2 Créer un premier programme

- [ ok] Tap FAB (+) → formulaire de création s'ouvre
- [ ok] Saisir un nom (ex : "Push Pull Legs") → valider
- [ ok] Programme apparaît dans la liste
- [ ] Badge "actif" absent par défaut -> s'il n'y a qu'un programme, le rendre actif par défaut, et par défaut, le dernier ajouté est actif jusqu'a ce que l'utilisateur rende un programme actif. Est-ce que ce serait ergonomique ?

### 1.3 Créer un deuxième programme

- [ok ] Créer un 2e programme (ex : "Full Body")
- [ok ] Les deux programmes sont visibles dans la liste
- [ ] Aucun n'est actif

Je reflechis au fait que l'on a aucune indication d'edition si l'on veut supprimer modifier rendre actif etc. le programme

### 1.4 Activer un programme

- [ ok] Long-press sur "Push Pull Legs" → menu apparaît avec "Modifier / Activer / Supprimer / Annuler"
- [ ok] Tap "Activer" → badge "actif" apparaît sur la carte
- [ ok] Retour accueil → affiche "Aucune séance configurée" (programme actif mais sans séances)

### 1.5 Un seul programme actif à la fois

- [ ok] Long-press sur "Full Body" → tap "Activer"
- [ ok] "Full Body" devient actif, "Push Pull Legs" perd son badge
- [ ok] Réactiver "Push Pull Legs" pour la suite

### 1.6 Modifier et supprimer

- [ ok] Long-press → "Modifier" → changer le nom → sauvegarder → nom mis à jour
- [ok ] Créer un 3e programme "Test" → long-press → "Supprimer" → confirmation → disparaît
- [ok ] Supprimer le programme actif → accueil repasse en "Aucun programme actif"
- [ ok] Réactiver "Push Pull Legs" avant de continuer

---

## Partie 2 — Configuration des séances

### 2.1 Créer les séances

Ouvrir le programme "Push Pull Legs".

- [ ok] Tap FAB (+) → créer "Push"
- [ ok] Créer "Pull"
- [ ok] Créer "Legs"
- [ ok] Les 3 séances apparaissent dans la liste

Mouais, peut etre que le drag and drop était plus ergonomique après coup finalement

### 2.2 Réordonner les séances

- [ok ] Flèche ↑ sur "Pull" → "Pull" passe avant "Push"
- [ ok] Flèche ↓ sur "Pull" → revient à l'ordre initial
- [ ok] L'ordre est persisté après navigation (quitter et revenir)
- [ok ] La flèche ↑ est absente sur la 1re séance, ↓ absente sur la dernière

### 2.3 Configurer la séance Push

Tap sur "Push".

#### Ajouter des exercices

- [ok ] Tap FAB (+) → écran de recherche s'ouvre
- [ ok] Taper "bench" → résultats filtrés en temps réel
- [ok ] Taper une chaîne sans résultat → message "Aucun exercice trouvé" + bouton "Créer un exercice"
- [ ok] Tap "Créer un exercice" → navigue vers le formulaire de création -> peut etre qu'a ce moment, on pourrait renseigner le champ nom avec la recherche qui a été faite non ?
  .

- [ ok] Revenir, chercher "bench" → ajouter "Bench Press" -> la liste ne semble pas se mettre a jour apres avoir créé "Bench press", on doit quitter la partie exercice pour revenir ensuite pour que ça se rafraichisse
- [ok ] Bench Press apparaît dans la liste avec un bloc "Travail" par défaut
- [ok ] Ajouter aussi "Overhead Press" et "Tricep Pushdown"

#### Réordonner les exercices

- [oik ] Flèche ↑/↓ sur Overhead Press → fonctionne
- [ok ] Ordre persisté après navigation : ok pour l'ordre mais par exmple pour leg, j'ai renseigné des exercices et si je fais retour, le state ne se met pas ajour : j'ai toujours "0 exercice" d'affiché

#### Configurer les blocs de Bench Press

Tap sur la carte Bench Press pour l'étendre.

- [ok] Badge TRAVAIL (couleur primaire) visible sur le bloc existant
- [ok] Bloc unique → hint en italique "Ajoute des blocs pour structurer ta séance..."
- [ok] Tap "+" (ajouter bloc) → modal s'ouvre avec chips "Échauffement / Travail / Back-off"
- [ok] Tap chip "Échauffement" → nom pré-rempli "Échauffement", toggle is_work_block = REPOS
- [ok] Tap chip "Travail" → nom pré-rempli "Travail", toggle is_work_block = TRAVAIL
- [ ok] Chip sélectionnée → fond légèrement teinté
- [ok ] Sauvegarder → bloc ajouté, hint disparaît (2 blocs maintenant)
- [ok ] Badge REPOS (gris) sur Échauffement, badge TRAVAIL sur Travail

#### Modifier les blocs

- [ ok] Long-press sur un bloc → modal s'ouvre en mode édition
- [ ok] Chips absentes en mode édition
- [ok ] Renommer le bloc → sauvegardé

#### Réordonner les blocs

- [ok ] Flèches ↑/↓ sur les blocs → fonctionne
- [ ok] Ordre persisté : globalement y a trop de fleches de partout et l'ui doit delimiter un peu plus les blocs entre eux

#### Configurer les séries du bloc Travail

Tap sur le bloc "Travail" pour l'étendre.

- [ ok] Tap "+" → série ajoutée avec valeurs par défaut (reps, poids, repos)
- [ok ] Modifier reps → sauvegardé
- [ ok] Modifier poids → sauvegardé
- [ ok] Modifier durée repos → sauvegardé
- [ ok] Ajouter une 2e et 3e série : probleme lorsque onb ajoute une série, le toggle se ferme
- [ ok] Flèches ↑/↓ → réordonner les séries, persisté - trop de fleches encore
- [ ok] Supprimer une série → disparaît

---

## Partie 3 — Conduire une séance

### 3.1 Lancer la séance

- [ ok] Retour accueil → carte "PROCHAINE SÉANCE : Push" visible
- [ ok] Tap "Démarrer" → écran de session s'ouvre

### 3.2 Check-in

- [ ok] 3 lignes : Énergie / Fatigue / Sommeil
- [ ok] Bouton "Commencer" désactivé tant que les 3 ne sont pas sélectionnés
- [ ok] Sélectionner les 3 → bouton s'active
- [ ok] Tap "Commencer" → phase Running

Sympa les smileys mais je pense que l'on pourrait avoir quelque chose de plus stylisé pour l'appli

### 3.3 Phase Running

- [ ok] Header affiche le nom de l'exercice + progression ("1 / 3 exercices")
- [ok ] Badge du bloc visible (ex : TRAVAIL, ÉCHAUFFEMENT)
- [ ok] Cible affichée (ex : "80 kg × 6–8 rép")
- [ ok] Séries restantes du bloc affichées en bas (grisées)

Globalement, sur cette page, je pense que l'on peut faire mieux dans la hierarchie de l'info encore.

Malgré que des exercices soient mis dans la séance, 0 exercices restent affichés

Au niveau de la logique peut etre devrions nous prévoir directement un type de séance qui ne serait pas muscu mais running ou stretching. Et avoir des exercices en fonction.

### 3.4 Valider une série

- [ok ] Champs Reps et Poids pré-remplis avec les valeurs cible
- [ ok] Modifier les reps → modifiable
- [ ok] Champ RPE optionnel (laisser vide = null) -> C'est quoi RPE deja ?
- [ ok] Tap "Valider" → série loggée, timer démarre

Une sonnerie et/ou vibration devrait etre declanché a la fin du timer. Aussi j'ai remarqué que le timer s'arretait lorsqu'on mettait l'application en fond et que l'on faisait autre chose. Pas ok pour ça.

### 3.5 Timer de repos

- [ ok] Timer démarre automatiquement après validation
- [ ok] Tap timer → pause
- [ok ] Tap à nouveau → reprend
- [ok ] Timer atteint 00:00 → s'arrête (pas de négatif)
- [ok ] Série suivante → timer reset avec sa propre durée de repos

Autre chose avec le timer, pourrait changer de couleur en fonction du rebours. Pensons a d'autres fonctionalités et peut etre faire plus graphique.
Amener les milisecondes par exemple. Mais d'autres idées aussi

### 3.6 Bouton "Passer"

- [ ok] Tap "Passer →" → avance sans logger
- [ ok] La série passer n'apparaît pas dans le résumé final

### 3.7 Bouton "Tout réussi ⚡"

- [ ] Tap → valide avec reps_max + poids cible, RPE null
- [ ] Avance à la série suivante

-> graphiquement mettre peut etre avant valider ? Et ne ressort peut etre pas assez

### 3.8 Navigation arrière

- [ ok] Bouton Back système → la session reste en cours (pas de reset)
- [ ok] Naviguer dans l'app → session non détruite

### 3.9 Fin de séance

- [ko ] Après la dernière série → écran Summary automatiquement
  Je n'ai pas de résumé de séance

---

## Partie 4 — Résumé de séance

- [ko ] "🎉 Séance terminée !" affiché
- [ ko] Durée totale affichée
- [ ko] Nombre de séries loggées correct
- [ ko] Nombre de progressions affiché

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

| #   | Écran | Action | Comportement observé | Sévérité |
| --- | ----- | ------ | -------------------- | -------- |
|     |       |        |                      |          |

---

> Dernière mise à jour : 2026-05-29 (session 14)

J'arrete ici, je vais l'essayer pendant une semaine et vais noter mes retours
