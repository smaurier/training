# Philosophie — Entraînement sérieux, sans les mécaniques toxiques

**Date :** 2026-06-12  
**Statut :** Approuvé — document de référence permanent  
**Portée :** Toutes les décisions UX, copy, features, et backlog de l'app

---

## 1. Positionnement

> *"Ta progression est visible, motivante, et personnelle. Elle ne te compare à personne. Elle ne te punit jamais. Elle est là quand tu la cherches, silencieuse quand tu ne la cherches pas."*

### Ce que l'app est
- Un outil de suivi d'entraînement **complet et sérieux** : progression automatique, 1RM, volume, historique, RPE, déload
- Un **compagnon bienveillant** : ton ami coach qui est dans ton coin, jamais dans ton visage
- Un journal personnel : tes données t'appartiennent, elles ne servent qu'à toi

### Ce que l'app n'est pas
- Une compétition (pas de classements, pas de comparaisons)
- Une source de culpabilité (pas de punition si tu rates)
- Un système de dopamine toxique (pas de streaks qui se brisent, pas de notifications anxiogènes)

### Pourquoi ce positionnement existe
Les applications sport dominantes (Strong, Hevy, JEFIT, Strava) ciblent les mêmes utilisateurs mais amplifient l'anxiété : classements, streaks agressives, chiffres imposés. Le marché des pratiquants sérieux qui veulent arrêter d'en faire une obsession est **mal servi**.

---

## 2. Fondements scientifiques

### Auto-Détermination (Deci & Ryan, 1985–2000)
La motivation durable repose sur trois besoins psychologiques : **autonomie**, **compétence**, **appartenance**. Les mécaniques compétitives (classements, comparaisons) satisfont la compétence à court terme mais détruisent l'autonomie. La culpabilisation détruit les trois. L'app doit nourrir autonomie (tu choisis quand tu t'entraînes, sans pression) et compétence (tu vois ta progression personnelle).

**Implication :** La courbe de progression 1RM est une mécanique de compétence — elle est légitime et motivante. Les classements externes ne le sont pas.

### Renforcement positif vs punitif (Skinner, Fogg)
BJ Fogg (Tiny Habits, Stanford) : la célébration immédiate après un comportement renforce durablement l'habitude. La punition de l'absence crée de l'évitement, pas de l'adhérence. Fogg cite explicitement les streaks punitives comme anti-pattern pour la formation d'habitudes chez l'adulte.

**Implication :** Le compteur de présences monte, ne tombe jamais. Le PR est célébré chaudement, l'absence est ignorée.

### Effet de surjustification (Lepper, Greene, Nisbett, 1973)
Une récompense extrinsèque (badge, classement, points) sur une activité intrinsèquement motivante **réduit** la motivation intrinsèque à long terme. Les utilisateurs qui commencent à s'entraîner pour fermer les anneaux Apple Watch finissent par ne s'entraîner **que** pour les anneaux — et arrêtent quand l'app disparaît.

**Implication :** Les features de gamification (badges, streaks, points) doivent être additives et personnelles, jamais compétitives ni punitives.

### Adhérence à long terme (Dishman, 1994 ; Teixeira et al., 2012)
Les méta-analyses sur l'adhérence à l'exercice montrent que les facteurs prédictifs de **continuité sur 12+ mois** sont : le plaisir ressenti pendant/après la séance, la perception de compétence (je progresse), et l'absence de pression sociale. La compétition externe réduit l'adhérence chez les pratiquants non compétiteurs.

**Implication :** Le check-in ressenti avant/après séance n'est pas cosmétique — c'est une donnée prédictive de l'adhérence. La collecter est scientifiquement pertinent.

### Science de la progression (Schoenfeld, 2010 ; Helms, Aragon, Fitschen, 2014)
La surcharge progressive, le RPE auto-régulé, et le déload périodique sont **validés par la littérature**. Les features de progression automatique, déload, et feedback intelligent de l'app sont des implémentations correctes de la science. Les garder est la bonne décision.

**Implication :** Les programmes PPL, la progression par paliers, le déload — tout ça est de la science appliquée, pas de la performance toxique. La philosophie de l'app ne les contredit pas.

### Paradoxe du choix (Schwartz, 2004)
Trop de métriques imposées crée de l'anxiété décisionnelle. Les "maximiseurs" (ceux qui cherchent toujours l'optimal) sont significativement moins satisfaits que les "satisfaisants" (ceux qui cherchent "assez bien"). Une app qui pousse 12 métriques en permanence fabrique des maximiseurs malgré eux.

**Implication :** Les stats sont riches dans l'onglet dédié — tu les tires quand tu veux. Elles ne sont pas imposées sur l'accueil.

---

## 3. Architecture de l'information

### Principe fondateur
**Deux écrans, deux rôles.**

| Onglet Séance | Onglet Progression |
|---|---|
| "Je vais m'entraîner" | "Je veux voir ma courbe" |
| Action | Récompense / information |
| Pas de stats perf | Stats riches et directes |
| Check-in, programme du jour | 1RM, volume, meilleures marques |

### Règle : pas de stats sur l'accueil
L'accueil est une invitation à bouger, pas un bilan. Aucun chiffre de performance ne s'affiche sur l'écran Séance sans que l'utilisateur l'ait demandé.

### Règle : pas de notifications push PR
Les meilleures marques sont célébrées **en séance** (badge discret, une fois). Pas de notification push après la séance. L'utilisateur découvre ses stats quand il va les chercher.

### Onglet Progression
- Vue par défaut : courbes 1RM (ce qui motive)
- Segmented control : Progression | Historique
- Contenu riche : 1RM par exercice, volume, meilleures marques, delta 30j
- Aucun élément comparatif externe

---

## 4. Nommage & copy

### Changements validés

| Avant | Après | Raison |
|---|---|---|
| 🏆 Nouveau PR ! | ✦ Nouvelle meilleure marque | Personnel, pas compétition |
| Tout réussi | Tout fait | Factuel, pas évaluatif |
| Objectif : 6–8 reps | Cible : 6–8 reps | Repère, pas jugement |
| C'EST PARTI ! (RestPhase, fin timer) | À toi · | Moins agressif visuellement, signal de départ conservé |
| Streak (V2 — pas encore implémenté) | Présences ce mois | Additif uniquement, compteur qui monte jamais tombe |

### Inchangé (termes techniques neutres)
Progression, 1RM, Volume, Déload, Séries, Reps, RPE, Valider, Passer, Séance, Exercices, Programmes.

### Règle de copy — la table de décision

| ❌ Ne jamais écrire | ✓ Toujours écrire |
|---|---|
| "Tu n'as pas fait de séance depuis 5 jours" | "3 séances ce mois · continue" |
| "Streak perdue" | "Nouvelle meilleure marque ✦" |
| "Tu as raté ton objectif" | "Cible atteinte" |
| "Tes performances sont en baisse" | "Ton évolution sur 3 mois" |
| "Comparé à la moyenne" | "Ta meilleure marque personnelle" |

**Test pour chaque message :** *"Ce message célèbre ce qui s'est passé, ou punit ce qui n'a pas eu lieu ?"* Si c'est le second — supprimer.

---

## 5. Onboarding

### Écran 0 — Bienvenue (s'insère avant le wizard existant)

```
Bienvenue.

Cette app est un carnet d'entraînement.
Elle suit ta progression. Elle te guide en séance.
Elle n'est pas là pour te juger.

───────────────────────
Pas de classements. Pas de comparaisons.
Pas de message si tu rates une séance.

Ta courbe de progression t'appartient.
Elle est là quand tu la cherches.
───────────────────────

→ Créer mon premier programme
```

### Wizard (écrans 1–3, backlog existant)
- Écran 1 : Choisir un programme (PPL, Full body, ou créer)
- Écran 2 : Fréquence hebdomadaire
- Écran 3 : Première séance — on y va ?

---

## 6. Anti-patterns à ne jamais introduire

Ces trois dérives ont détruit des apps qui partageaient un positionnement similaire :

**Strava Effect** — feature creep vers la compétition. Classements, challenges publics, comparaisons de segments. Une seule feature compétitive suffit à changer la perception de toute l'app.

**Noom Effect** — philosophy-washing. La philosophie douce est dans le marketing, l'UX reste anxiogène. Les utilisateurs se sentent trompés. Le test : *est-ce que l'accueil pousse des chiffres de perf ? Si oui, le discours et l'app sont en contradiction.*

**Apple Rings Effect** — punition implicite sans compétition. Un élément rouge, une barre incomplète, un anneau vide — suffisent à créer de l'anxiété sans aucun message explicite. Chaque élément visuel doit passer le test : *est-ce que cet élément peut faire culpabiliser ?*

---

## 7. Filtre de décision permanent

Pour chaque nouvelle feature ou modification, poser ces trois questions :

1. **Flèche :** Cette feature célèbre la présence (✓) ou punit l'absence (✗) ?
2. **Direction :** La donnée est tirée par l'utilisateur (✓) ou poussée vers lui (✗) ?
3. **Comparaison :** La feature compare l'utilisateur à lui-même (✓) ou à d'autres (✗) ?

Trois ✓ = go. Un ✗ = revoir le design avant d'implémenter.

---

## 8. Ce document dans le projet

- Ce fichier : référence de design permanente
- `app/CLAUDE.md` : section "Philosophie" avec le filtre de décision (à ajouter)
- Backlog : audit anti-perf + nouvelles features cohérentes (voir section suivante)
