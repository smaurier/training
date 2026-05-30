# Changelog

Toutes les modifications notables sont documentées ici.
Format : [Semantic Versioning](https://semver.org/). Types : `feat`, `fix`, `ux`, `refactor`, `docs`, `chore`.

---

## [1.0.0] — 2026-05-30 — MVP

### feat
- Programmes : création, activation, séquence de séances
- Configuration séance : exercices, blocs (travail/repos), séries avec poids/reps cibles
- Conduite de séance : check-in, phase active (timer pause, RPE, "Tout réussi"), résumé
- Progression automatique des poids (seuil configurable par exercice)
- Historique des séances groupé par mois
- Dashboard stats : volume 4 semaines, PRs récents, liste 1RM par exercice
- Détail exercice : graphique 1RM, meilleur PR, historique PRs
- Design system Trace : palette monochrome anthracite/blanc, tokens Radius, police Inter

### fix
- Résumé de séance toujours affiché (`calculateProgressions` isolé en try/catch)
- Toggle exercice ne se ferme plus à l'ajout de série
- Compteur exercices réel dans WorkoutCard (requête SQLite)
- Liste exercices rafraîchie après création depuis la recherche
- Timer pause survive au suspend OS (timestamp absolu + AppState)
- Vibration à la fin du timer de repos
- ON DELETE CASCADE sur session_logs / set_logs / personal_records

### ux
- Check-in : segmented control texte (sans emojis)
- Badge TRAVAIL/REPOS sur les blocs
- Hint "ajouter un bloc" si exercice sans bloc
- Chips suggestions dans EditBlockModal
- Bouton "Créer un exercice" sur liste vide dans la recherche
- Auto-activation du premier programme créé
- Pre-fill nom exercice depuis la recherche
- "Tout réussi ⚡" avant "Valider" (fond ambre)
- Séparateur visuel entre blocs, flèches séries supprimées
- Réordonnancement ↑/↓ exercices, blocs, séances

---
