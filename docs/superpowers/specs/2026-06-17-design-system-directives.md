# Design System — Directives graphiques

**Date :** 2026-06-17  
**Statut :** Approuvé  
**Scope :** Direction visuelle globale + directives par écran clé

---

## Direction esthétique : Tactique / Data

Feeling "tableau de bord pour athlète sérieux". Chiffres en avant, dark-first, progression visible sans gamification. Pas de décorations, chaque choix visuel a une fonction.

**Références mentales :** dashboard sportif, not fitness gamification app.

---

## Design system global

### Palette

Dark (cas principal — toujours tester en dark en premier) :

| Token | Valeur | Usage |
|---|---|---|
| `background` | `#0D0D0D` | Fond principal |
| `surface` | `#1A1A1A` | Cards, modales |
| `surfaceElevated` | `#242424` | Chips, inputs |
| `text` | `#FFFFFF` | Texte principal |
| `textSecondary` | `#888888` | Labels, sous-titres |
| `textDisabled` | `#444444` | États désactivés |
| `border` | `#2A2A2A` | Séparateurs, contours |
| **accent** | **`#84CC16`** | **Lime — voir règles ci-dessous** |

Light (secondaire — respecter le système OS) : palette existante dans `Colors.ts`, inchangée.

### Couleur accent — Lime `#84CC16`

**Règle d'or : 1 seul élément lime visible par écran en état de repos.**

Usages autorisés (par priorité) :
1. Barre de progression active (segments complétés du cycle)
2. CTA principal (fond lime, texte noir, letterspacing)
3. Chip / option sélectionnée
4. PR badge texte
5. État "success" / confirmation ponctuelle

Usages interdits :
- Texte courant ou labels permanents
- Bordures décoratives
- Icônes de navigation
- Fond d'écran ou section entière

### Typographie

Inter uniquement. Règles d'échelle :

| Usage | Token | Taille | Poids |
|---|---|---|---|
| Chiffres clés, titres héros | `display` | 32px | Inter_900Black |
| Chiffres actifs en séance | hors scale | 48px+ | Inter_900Black |
| Titres écran | `title` | 20px | Inter_700Bold |
| Sous-titres sections | `heading` | 17px | Inter_600SemiBold |
| Corps | `body` | 15px | Inter_400Regular |
| Valeurs importantes | `bodyMedium` | 15px | Inter_500Medium |
| Labels uppercase | `label` | 13px | Inter_600SemiBold + letterSpacing 1-2px + textTransform uppercase |
| Métadonnées | `caption` | 11px | Inter_400Regular |

### Radius

Rester flat — pas de rondeur décorative.

| Token | Valeur | Usage |
|---|---|---|
| `xs` | 2px | Badges, chips, petits éléments |
| `sm` | 4px | Cards, boutons, inputs |
| `md` | 8px | Modales, bottom sheets seulement |
| `full` | 999px | Avatars circulaires uniquement |

### Espacement

Gap et padding en multiples de 4 : 4, 8, 12, 16, 20, 24. Préférer 20-24 pour padding conteneur principal.

---

## Directives par écran

### Home (`app/(tabs)/index.tsx`)

Structure tableau de bord :

```
PROCHAINE SÉANCE          [label uppercase, textSecondary]
Push A                    [title bold, text]
● ● ○ ○ ○                [barre cycle : lime = fait, #2A2A2A = à venir, gap 2px, height 3px]
il y a 3 jours            [caption, textSecondary]
[POITRINE] [PUSH A▼]     [chips outline border, selected = fond lime/texte noir]
[▶ DÉMARRER]             [fond lime, texte noir, letterspacing 2px, paddingVertical 14]
```

- Hero icon supprimable à terme — la barre de cycle remplace son rôle informatif
- Chips séance : selected = fond `#84CC16`, texte `#000000`
- ResumeSessionCard : border gauche lime 3px, pas de fond coloré

### Session > Running (`components/session/RunningPhase.tsx`)

Plein écran dark, zéro chrome superflu.

```
[TRAVAIL — 3/5]           [badge uppercase xs, surface elevated, lettersacing]
Développé couché          [heading, textSecondary]
95                        [48px+ Inter_900Black, text blanc, centré]
kg                        [caption, textSecondary, aligné baseline]
━━━━━━━━━━░░░            [progress séries : lime/border, height 3px]
Référence : 90 kg × 8    [caption, textSecondary]
[    VALIDER    ]         [fond lime, texte noir, minHeight 64, radius sm, pleine largeur]
```

- Undo et skip : icônes discrètes `textDisabled`, pas de boutons pleins
- Badge PR : apparition ponctuelle, fond lime `#84CC16`, texte noir — migrer depuis `#ca8a04` actuel pour cohérence accent unique
- Poids en `display` — c'est l'info principale, elle doit dominer visuellement

### Session > Rest (`components/session/RestPhase.tsx`)

```
[arc circulaire lime sur fond #1A1A1A]
2:00                      [display, text blanc, centré]
Prochain : Squat          [caption, textSecondary, bas d'écran]
[    Passer    ]          [outline blanc, pas lime — le repos est neutre]
```

- Arc lime = temps restant (diminue)
- Timer en display Black, pas en label
- Bouton Passer en outline `border` — le lime serait incitatif, le repos doit être respecté

### Session > Summary (`components/session/SummaryPhase.tsx`)

Cards data factuelles, disposition en grille ou stack :

```
12 séries     55 min     4 200 kg     [title bold / caption uppercase]
```

- Chaque stat : valeur en `title` bold, label en `label` uppercase
- PR : texte lime `✦ Nouvelle meilleure marque — Développé couché`
- Humeur et tags : discrets, bas de page, pas de mise en avant
- **Interdits ici :** score global, pourcentage de complétion, comparaison à session précédente en mode "tu as fait mieux/moins bien"

### Programmes (`app/(tabs)/programmes.tsx` + cards)

```
[card surface, border #2A2A2A, radius sm]
  ┃  PPL — Push Pull Legs    [bord gauche lime 3px si programme actif]
     3 séances · 5 exercices [caption, textSecondary]
```

- Programme actif : seul indicateur = bord gauche lime 3px
- Programme inactif : zéro lime
- Liste séances interne : indentation, pas de bullets, `caption` body

### Exercices (`app/(tabs)/exercices.tsx`)

**Exception light autorisée** — seul écran en fond `#F5F5F5` / `background` light.  
Raison : liste longue, lecture prolongée, meilleure densité de scan.  
Cette exception ne s'étend pas aux autres écrans.

```
Chips groupes musculaires :
  - Sélectionné : fond lime, texte noir
  - Non sélectionné : fond surfaceElevated, texte textSecondary
Search bar : fond surface, border border
ExerciseCard : fond surface, border border, radius sm
```

### Progression (`app/(tabs)/progression.tsx`)

```
Graphique barres :
  - Barres passées : #444444
  - Barre mois/période actuelle : #84CC16
  - Pas d'axe Y trop chargé — 3-4 graduations max

1RM Card :
  95 kg                   [display Black]
  +2.5 kg ce mois         [caption, textSecondary — factuel, pas flèche rouge]
```

- Zéro flèche rouge, zéro "baisse détectée"
- Tendances : toujours formulées positivement ou factuellement

### Réglages (`app/(tabs)/reglages.tsx`)

Full B&W — zéro lime.

```
SECTION HEADER            [label uppercase, textSecondary, border-bottom]
  Nom du réglage          [body, text]
  Valeur                  [bodyMedium, textSecondary, aligné à droite]
```

---

## Règles cross-écran

1. **Lime = action ou achievement** — jamais décoratif
2. **Uppercase + letterSpacing = labels structurels** — pas de contenu
3. **Display Black = chiffre qui compte** — poids, timer, stats clés
4. **Border `#2A2A2A` = séparateur** — pas de `hairline`, pas de shadow sauf bottom-sheet
5. **Radius flat** — `xs` ou `sm` seulement, `md` réservé modales

---

## Test de conformité (à appliquer à chaque PR UI)

- [ ] Écran testé en dark mode en premier
- [ ] Combien d'éléments lime visibles au repos ? → max 1
- [ ] Le CTA principal est-il lime (si applicable) ?
- [ ] Tous les labels structurels sont-ils en uppercase + letterSpacing ?
- [ ] Les chiffres clés utilisent-ils Inter_900Black ?
- [ ] Aucune valeur de couleur hardcodée (toujours `colors.xxx`) ?
