# Prompt — Directives graphiques Trace
# À copier-coller dans claude.ai/design

---

Tu travailles sur **Trace**, une application mobile React Native de suivi d'entraînement musculaire (nom provisoire). Voici les directives graphiques strictes à respecter pour tout travail de design ou de code UI.

## Direction esthétique : Tactique / Data

Feeling "tableau de bord pour athlète sérieux". Chiffres en avant, dark-first, progression visible sans gamification. Chaque choix visuel a une fonction — zéro décoration gratuite.

Ce n'est pas une app de fitness ludique. Pas de streaks, pas de classements, pas de messages culpabilisants. Le design doit refléter ça : austère, factuel, efficace.

## Palette

Dark mode (priorité absolue — toujours concevoir en dark en premier) :
- Background : #0D0D0D
- Surface (cards, modales) : #1A1A1A
- Surface elevated (chips, inputs) : #242424
- Texte principal : #FFFFFF
- Texte secondaire : #888888
- Texte désactivé : #444444
- Bordures : #2A2A2A
- **Accent unique : Lime #84CC16**

Light mode : #F5F5F5 background, #FFFFFF surface, #0D0D0D text — uniquement quand le dark ne convient pas (exemple : liste longue de bibliothèque).

## Couleur accent — Lime #84CC16

**Règle absolue : 1 seul élément lime visible par écran en état de repos.**

Autorisé :
- Barre de progression active (segments complétés)
- Bouton CTA principal (fond lime, texte noir)
- Chip / option sélectionnée (fond lime, texte noir)
- Badge PR / meilleure marque
- Confirmation / état success ponctuel

Interdit :
- Texte courant ou labels permanents
- Bordures décoratives
- Icônes de navigation
- Fond de section ou d'écran

## Typographie — Inter uniquement

- Chiffres héros (poids actif, timer, stats clés) → Inter Black 48px minimum, centré
- Titres d'écran → Inter Bold 20px
- Labels structurels → Inter SemiBold 13px, UPPERCASE, letterSpacing 1-2px
- Corps → Inter Regular 15px
- Valeurs importantes → Inter Medium 15px
- Métadonnées → Inter Regular 11px, textSecondary
- CTAs → Inter Bold, UPPERCASE, letterSpacing 2px

## Border radius — Rester flat

- 2px : chips, badges, petits éléments
- 4px : cards, boutons, inputs
- 8px : modales et bottom sheets uniquement
- 999px : avatars circulaires uniquement

Pas d'arrondi décoratif. Le flat reinforces le feeling tactique.

## Espacement

Multiples de 4 uniquement : 4, 8, 12, 16, 20, 24. Padding conteneur principal : 20-24px.

---

## Directives par écran

### Écran Home (sélection séance)

```
PROCHAINE SÉANCE                    ← label uppercase, textSecondary
Push A                              ← Inter Bold 20px, blanc
● ● ○ ○ ○                          ← barre cycle : lime = fait, #2A2A2A = à venir
il y a 3 jours                      ← 11px, textSecondary
[POITRINE]  [ÉPAULES]  [PUSH A ✓]  ← chips, sélectionné = fond lime/noir
[▶  DÉMARRER]                       ← fond lime, texte noir, letterSpacing 2px
```

Le hero (icône haltère) peut disparaître — la barre de cycle remplace son rôle. Priorité à l'information utile.

### Écran Session — Phase active (Running)

Plein écran dark, zéro chrome superflu. L'athlète est en train de soulever.

```
TRAVAIL — 3/5               ← badge uppercase, surface elevated
Développé couché            ← Inter SemiBold 17px, textSecondary
95                          ← Inter Black 48px+, blanc, centré
kg                          ← 11px, textSecondary, baseline
━━━━━━░░░                  ← progress séries lime/border, 3px height
Référence : 90 kg × 8      ← 11px, textSecondary
[        VALIDER        ]   ← fond lime, texte noir, minHeight 64, radius 4px, pleine largeur
```

Undo et Skip : icônes discrètes en textDisabled — pas de boutons pleins.
Le poids est l'information principale. Il doit dominer visuellement.

### Écran Session — Phase de repos (Rest)

```
     ╭──────────╮
    ╱   2:00     ╲       ← Inter Black 32px+, centré
   │   [arc lime] │      ← arc circulaire lime sur fond #1A1A1A
    ╲             ╱
     ╰──────────╯
Prochain : Squat           ← 11px, textSecondary
[      Passer      ]       ← outline blanc — PAS lime (le repos est neutre)
```

Le bouton Passer est en outline blanc délibérément. Le lime serait incitatif à écourter le repos — ce n'est pas le but.

### Écran Session — Résumé (Summary)

Données factuelles uniquement.

```
12 séries    55 min    4 200 kg
SÉRIES       DURÉE     VOLUME TOTAL   ← labels uppercase caption
```

Règles strictes :
- Chaque stat : valeur en Inter Bold 20px, label en uppercase 11px
- PR : texte lime "✦ Nouvelle meilleure marque — Développé couché"
- Humeur et tags : discrets, bas de page
- **Interdit ici :** score global, pourcentage de complétion, "tu as fait mieux/moins bien que la semaine dernière", flèches comparatives

### Écran Programmes

Cards surface avec border #2A2A2A. Programme actif : seul indicateur = bord gauche lime 3px.

```
┃ PPL — Push Pull Legs         ← bord gauche lime 3px (actif uniquement)
  3 séances · 12 exercices     ← caption textSecondary
  Dernière : il y a 2 jours
```

Les programmes inactifs n'ont aucun lime. La distinction est immédiate.

### Écran Exercices (bibliothèque)

**Seul écran autorisé en light** — fond #F5F5F5. Raison : liste longue, lecture prolongée, scan visuel rapide. Cette exception ne s'étend pas aux autres écrans.

- Chips groupes musculaires : sélectionné = fond lime + texte noir, non sélectionné = surfaceElevated
- Search bar : fond surface, border border
- ExerciseCard : fond surface, border, radius 4px

### Écran Progression (graphiques)

```
Graphique barres :
  Barres passées     → #444444
  Barre période actuelle → #84CC16 (lime)
  Max 4 graduations axe Y

1RM Card :
  95 kg              ← Inter Black 32px
  +2.5 kg ce mois    ← 11px textSecondary (factuel, pas de flèche rouge)
```

Toujours formuler les tendances positivement ou factuellement. Jamais "tes performances baissent".

### Écran Réglages

Full B&W, zéro lime.

```
SECTION                            ← label uppercase, border-bottom
  Nom du réglage    Valeur →       ← body / bodyMedium textSecondary aligné droite
```

---

## Anti-patterns à éviter absolument

- Fond rouge ou orange pour signaler une absence ou un échec
- Texte "tu n'as pas fait de séance depuis X jours"
- Streaks avec indication visuelle de "rupture"
- Comparaisons à d'autres utilisateurs
- Score global de performance
- Flèches rouges descendantes
- Plus de 1 élément lime visible au repos

## Checklist avant de proposer un design

- [ ] Conçu en dark mode en premier
- [ ] Max 1 élément lime visible au repos sur l'écran
- [ ] Le CTA principal est-il en fond lime / texte noir ?
- [ ] Les chiffres clés sont-ils en Inter Black taille dominante ?
- [ ] Les labels structurels sont-ils en uppercase + letterSpacing ?
- [ ] Aucune couleur hardcodée (utiliser les tokens)
- [ ] L'information passe-t-elle le filtre : factuelle, additive, personnelle ?
