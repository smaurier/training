# Design Polish — 5 Token Harmonization Tasks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atteindre zéro valeur hardcodée — radius 16/20, couleurs hex sémantiques, fontWeight strings, letterSpacing négatifs manquants, barres historiques.

**Architecture:** 5 tâches mécaniques indépendantes. Chaque tâche modifie les tokens dans `constants/` et remplace les valeurs hardcodées dans les composants. Aucune logique fonctionnelle touchée.

**Tech Stack:** React Native / Expo SDK 54, TypeScript strict, token system dans `app/constants/` (Colors.ts, SemanticColors.ts, Spacing.ts, Radius.ts, Typography.ts)

---

## Fichiers impactés

| Fichier | Tâches |
|---|---|
| `app/constants/SemanticColors.ts` | T2 |
| `app/constants/Typography.ts` | T4 |
| `components/programme/ShareQRModal.tsx:62` | T1 |
| `components/programmes/AddProgrammeBottomSheet.tsx:112` | T1 |
| `app/(tabs)/reglages.tsx:460` | T1, T2 |
| `app/progression/[exerciseId].tsx:480` | T1, T5 |
| `components/onboarding/ProgramScreen.tsx:180` | T2 |
| `components/progression/Exercise1RMCard.tsx:21-22` | T2 |
| `components/progression/VolumeBarChart.tsx:42` | T2 |
| `app/session/[workoutId].tsx:570,585` | T2 |
| `app/workout/[id].tsx:202,254,265` | T2 |
| ~32 fichiers fontWeight strings | T3 |
| `components/onboarding/PhilosophyScreen.tsx:57` | T4 |
| `components/onboarding/SessionDemoScreen.tsx:146` | T4 |
| `components/session/SummaryPhase.tsx:338` | T4 |

---

## Task 1: borderRadius 16/20 → tokens Radius

**Contexte :** 4 fichiers avec `borderRadius: 16` ou `borderRadius: 20`. Mapping selon CLAUDE.md — `xs:2` chips/badges, `md:8` modales.

**Files:**
- Modify: `components/programme/ShareQRModal.tsx:62`
- Modify: `components/programmes/AddProgrammeBottomSheet.tsx:112`
- Modify: `app/(tabs)/reglages.tsx:460`
- Modify: `app/progression/[exerciseId].tsx:480`

- [ ] **Step 1: Vérifier les occurrences**

```bash
cd app
grep -rn "borderRadius: 16\|borderRadius: 20" components/ app/ --include="*.tsx"
```

Attendu : 4 lignes exactement (ShareQRModal:62, AddProgrammeBottomSheet:112, reglages:460, [exerciseId]:480)

- [ ] **Step 2: Remplacer dans les 4 fichiers**

`ShareQRModal.tsx:62` — modal card → `Radius.md` (8) :
```ts
// avant
card: { borderRadius: 16, padding: Spacing.xxl, ... }
// après
card: { borderRadius: Radius.md, padding: Spacing.xxl, ... }
```

`AddProgrammeBottomSheet.tsx:112` — bottom sheet → `Radius.md` (8) :
```ts
// avant
borderRadius: 20,
// après
borderRadius: Radius.md,
```

`reglages.tsx:460` — chip filtre → `Radius.xs` (2) :
```ts
// avant
chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 16, borderWidth: 1 },
// après
chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.xs, borderWidth: 1 },
```

`[exerciseId].tsx:480` — chip filtre → `Radius.xs` (2) :
```ts
// avant
chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
// après
chip: { borderWidth: 1, borderRadius: Radius.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
```

- [ ] **Step 3: Vérifier imports Radius**

```bash
grep -n "import.*Radius" components/programme/ShareQRModal.tsx components/programmes/AddProgrammeBottomSheet.tsx app/\(tabs\)/reglages.tsx app/progression/\[exerciseId\].tsx
```

Chaque fichier doit importer `Radius` depuis `'../../constants/Radius'` (ou chemin relatif correct). Ajouter si absent.

- [ ] **Step 4: Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreur.

- [ ] **Step 5: Vérifier aucune occurrence restante**

```bash
grep -rn "borderRadius: 16\|borderRadius: 20" components/ app/ --include="*.tsx"
```

Attendu : 0 résultat.

- [ ] **Step 6: Commit**

```bash
git add components/programme/ShareQRModal.tsx components/programmes/AddProgrammeBottomSheet.tsx app/\(tabs\)/reglages.tsx app/progression/\[exerciseId\].tsx
git commit -m "fix(tokens): borderRadius 16/20 → Radius.md / Radius.xs"
```

---

## Task 2: SemanticColors — compléter + appliquer

**Contexte :** SemanticColors actuel : `destructive`, `superset`, `supersetAlpha`, `cardio`, `dropset`, `stretch`, `prBadge`. Manquent : `positive` (delta vert), `negative` (delta rouge), `prBadgeTint` (fond texte PR).

**Files:**
- Modify: `app/constants/SemanticColors.ts`
- Modify: `components/onboarding/ProgramScreen.tsx:180`
- Modify: `components/progression/Exercise1RMCard.tsx:21-22`
- Modify: `components/progression/VolumeBarChart.tsx:42`
- Modify: `app/(tabs)/reglages.tsx:331`
- Modify: `app/session/[workoutId].tsx:570,585`
- Modify: `app/workout/[id].tsx:202,254,265`

- [ ] **Step 1: Ajouter 3 tokens dans SemanticColors.ts**

```ts
export const SemanticColors = {
  destructive: '#dc2626',
  superset: '#7c3aed',
  supersetAlpha: '#7c3aed20',
  cardio: '#ea580c',
  dropset: '#2563eb',
  stretch: '#16a34a',
  prBadge: '#ca8a04',
  positive:     '#22c55e',  // delta positif, état success
  negative:     '#ef4444',  // delta négatif, erreur légère
  prBadgeTint:  '#fef3c7',  // fond texte sous badge PR
} as const;
```

- [ ] **Step 2: Remplacer dans ProgramScreen.tsx:180**

```ts
// avant
errorText: { color: '#ef4444', fontSize: 13, fontFamily: FontFamily.regular },
// après
errorText: { color: SemanticColors.negative, fontSize: 13, fontFamily: FontFamily.regular },
```

Vérifier import `SemanticColors` présent.

- [ ] **Step 3: Remplacer dans Exercise1RMCard.tsx:21-22**

```ts
// avant
: item.delta > 0 ? '#22C55E'
: item.delta < 0 ? '#EF4444'
// après
: item.delta > 0 ? SemanticColors.positive
: item.delta < 0 ? SemanticColors.negative
```

- [ ] **Step 4: Remplacer dans VolumeBarChart.tsx:42**

```tsx
// avant
<Text style={[styles.delta, { color: delta >= 0 ? '#22C55E' : '#EF4444' }]}>
// après
<Text style={[styles.delta, { color: delta >= 0 ? SemanticColors.positive : SemanticColors.negative }]}>
```

- [ ] **Step 5: Remplacer dans reglages.tsx:331**

```tsx
// avant
<Text style={[styles.exportError, { color: '#dc2626' }]}>{exportError}</Text>
// après
<Text style={[styles.exportError, { color: SemanticColors.destructive }]}>{exportError}</Text>
```

- [ ] **Step 6: Remplacer dans [workoutId].tsx:570,585**

```ts
// ligne ~570, badge PR fond
// avant
backgroundColor: '#ca8a04',
// après
backgroundColor: SemanticColors.prBadge,

// ligne ~585, texte sous badge
// avant
prBadgeSub: { color: '#fef3c7', ... }
// après
prBadgeSub: { color: SemanticColors.prBadgeTint, ... }
```

- [ ] **Step 7: Remplacer dans workout/[id].tsx:202,254,265**

```tsx
// ligne ~202, bouton démarrer
// avant
style={[styles.startBtn, { backgroundColor: '#16a34a' }]}
// après
style={[styles.startBtn, { backgroundColor: SemanticColors.stretch }]}

// lignes ~254 et ~265, superset border + bg
// avant
borderColor: '#7c3aed',
backgroundColor: '#7c3aed',
// après
borderColor: SemanticColors.superset,
backgroundColor: SemanticColors.superset,
```

- [ ] **Step 8: Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreur.

- [ ] **Step 9: Vérifier aucune occurrence restante des hex ciblés**

```bash
grep -rn "'#22[Cc]55[Ee]'\|'#EF4444'\|'#ef4444'\|'#ca8a04'\|'#7c3aed'\|'#16a34a'\|'#dc2626'\|'#fef3c7'" components/ app/ --include="*.tsx" | grep -v SemanticColors.ts
```

Attendu : 0 résultat.

- [ ] **Step 10: Commit**

```bash
git add app/constants/SemanticColors.ts components/onboarding/ProgramScreen.tsx components/progression/Exercise1RMCard.tsx components/progression/VolumeBarChart.tsx app/\(tabs\)/reglages.tsx app/session/\[workoutId\].tsx app/workout/\[id\].tsx
git commit -m "fix(tokens): SemanticColors positive/negative/prBadgeTint + appliquer dans composants"
```

---

## Task 3: fontWeight strings → FontFamily tokens (32 fichiers)

**Contexte :** 32 fichiers utilisent encore `fontWeight: '700'` etc. au lieu des tokens FontFamily. Script Node.js (même approche que T3 Spacing de la session précédente). RunningPhase.tsx est le seul fichier ayant déjà des FontFamily tokens — aucun conflit dans les mêmes blocs de style (vérifié).

**Mapping :**
- `fontWeight: '900'` / `fontWeight: "900"` → `fontFamily: FontFamily.black`
- `fontWeight: '700'` / `fontWeight: "700"` → `fontFamily: FontFamily.bold`
- `fontWeight: '600'` / `fontWeight: "600"` → `fontFamily: FontFamily.semibold`
- `fontWeight: '500'` / `fontWeight: "500"` → `fontFamily: FontFamily.medium`
- `fontWeight: '400'` / `fontWeight: "400"` → `fontFamily: FontFamily.regular`

**Files:**
- Modify: ~32 fichiers `.tsx` dans `components/` et `app/`
- Script: `scripts/replace-fontweight.js` (temporaire, supprimer après)

- [ ] **Step 1: Compter les occurrences avant**

```bash
cd app && grep -rn "fontWeight: '[0-9]" components/ app/ --include="*.tsx" | wc -l
```

Note le chiffre (attendu : ~70 occurrences).

- [ ] **Step 2: Créer le script de remplacement**

Créer `app/scripts/replace-fontweight.js` :

```js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WEIGHT_MAP = {
  "'900'": 'FontFamily.black',
  '"900"': 'FontFamily.black',
  "'700'": 'FontFamily.bold',
  '"700"': 'FontFamily.bold',
  "'600'": 'FontFamily.semibold',
  '"600"': 'FontFamily.semibold',
  "'500'": 'FontFamily.medium',
  '"500"': 'FontFamily.medium',
  "'400'": 'FontFamily.regular',
  '"400"': 'FontFamily.regular',
};

const ROOT = path.join(__dirname, '..');
const result = execSync(
  `grep -rln "fontWeight: '[0-9]\\|fontWeight: \\"[0-9]" ${ROOT}/components ${ROOT}/app --include="*.tsx"`,
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

let totalReplacements = 0;

for (const filePath of result) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [weight, token] of Object.entries(WEIGHT_MAP)) {
    const re = new RegExp(`fontWeight: ${weight.replace(/'/g, "'")}`, 'g');
    const before = content;
    content = content.replace(re, `fontFamily: ${token}`);
    if (content !== before) {
      const count = (before.match(re) || []).length;
      totalReplacements += count;
      changed = true;
    }
  }

  if (changed) {
    // Ajouter import FontFamily si absent
    if (!content.includes("FontFamily")) {
      // Trouver le premier import pour insérer après
      content = content.replace(
        /^(import .+from '.+';?\n)/m,
        `$1import { FontFamily } from '${getRelativePath(filePath, ROOT)}';\n`
      );
    } else if (!content.includes("import { FontFamily") && !content.includes("import {FontFamily")) {
      // FontFamily déjà dans un import existant de Typography — vérifier
      if (!content.match(/import\s*\{[^}]*FontFamily[^}]*\}/)) {
        content = content.replace(
          /^(import .+from '.+';?\n)/m,
          `$1import { FontFamily } from '${getRelativePath(filePath, ROOT)}';\n`
        );
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${path.relative(ROOT, filePath)}`);
  }
}

console.log(`\nTotal: ${totalReplacements} remplacements dans ${result.length} fichiers`);

function getRelativePath(filePath, root) {
  const rel = path.relative(path.dirname(filePath), path.join(root, 'constants', 'Typography'));
  return rel.startsWith('.') ? rel : './' + rel;
}
```

- [ ] **Step 3: Vérifier que les imports FontFamily sont corrects dans les fichiers existants**

Avant d'exécuter le script, noter les fichiers qui ont déjà `FontFamily` importé (pour ne pas créer de doublon) :

```bash
cd app && grep -rln "FontFamily" components/ app/ --include="*.tsx" | sort > /tmp/already_has_fontfamily.txt && cat /tmp/already_has_fontfamily.txt
```

- [ ] **Step 4: Exécuter le script**

```bash
cd app && node scripts/replace-fontweight.js
```

Attendu : liste des fichiers modifiés + total remplacements.

- [ ] **Step 5: Vérifier les imports FontFamily (pas de doublons)**

```bash
cd app && grep -rn "import.*FontFamily" components/ app/ --include="*.tsx" | sort | uniq -d
```

Attendu : 0 doublon. Si doublon trouvé, supprimer la ligne dupliquée manuellement.

- [ ] **Step 6: Vérifier RunningPhase.tsx (seul fichier avec FontFamily + fontWeight)**

```bash
grep -n "fontFamily\|fontWeight" app/components/session/RunningPhase.tsx
```

Vérifier : chaque bloc de style n'a qu'une seule propriété `fontFamily`. Aucune ligne ne doit contenir les deux propriétés.

- [ ] **Step 7: Typecheck**

```bash
cd app && npm run typecheck
```

Si erreur sur import FontFamily path, corriger le chemin relatif dans le fichier concerné.

- [ ] **Step 8: Compter les occurrences restantes**

```bash
cd app && grep -rn "fontWeight: '[0-9]" components/ app/ --include="*.tsx" | wc -l
```

Attendu : 0.

- [ ] **Step 9: Supprimer le script**

```bash
rm app/scripts/replace-fontweight.js
```

- [ ] **Step 10: Commit**

```bash
cd app && git add -A
git commit -m "fix(tokens): fontWeight strings → FontFamily tokens (32 fichiers)"
```

---

## Task 4: LetterSpacing — tokens négatifs manquants

**Contexte :** LetterSpacing actuel : `tighter:-1, tight:-0.3, wide:0.5, wider:0.8, widest:1, spaced:1.6, max:2`. Les mockups montrent `-3` sur le hero 96px (timer/weight display) et `-2` sur les grandes headings 40px+. Ajouter `display:-3` et `hero:-2`. Appliquer aux éléments `FontFamily.black` existants sans letterSpacing.

**Files:**
- Modify: `app/constants/Typography.ts`
- Modify: `components/onboarding/PhilosophyScreen.tsx:57`
- Modify: `components/onboarding/SessionDemoScreen.tsx:146`
- Modify: `components/session/SummaryPhase.tsx:338`
- Modify: `components/onboarding/ReadyScreen.tsx:65`

- [ ] **Step 1: Ajouter tokens dans Typography.ts**

```ts
export const LetterSpacing = {
  display: -3,    // hero 96px+ (timer, weight display géant)
  hero:    -2,    // large 48-72px (titres onboarding)
  tighter: -1,   // 32-40px heading
  tight:   -0.3, // body dense
  wide:     0.5, // structural labels
  wider:    0.8, // chips / tags
  widest:   1,   // general labels
  spaced:   1.6, // section headers uppercase
  max:      2,   // CTA uppercase
} as const;
```

- [ ] **Step 2: Appliquer dans PhilosophyScreen.tsx:57**

`fontSize: 40, fontFamily: FontFamily.black` — déjà `LetterSpacing.tighter` (-1). Laisser tel quel (tighter est correct pour 40px).

Vérifier :
```bash
grep -n "letterSpacing\|fontSize: 40" components/onboarding/PhilosophyScreen.tsx
```

Si `LetterSpacing.tighter` déjà présent → rien à faire.

- [ ] **Step 3: Appliquer dans SessionDemoScreen.tsx:146**

```ts
// avant
restTimer: { fontSize: 64, fontFamily: FontFamily.black },
// après
restTimer: { fontSize: 64, fontFamily: FontFamily.black, letterSpacing: LetterSpacing.hero },
```

- [ ] **Step 4: Appliquer dans SummaryPhase.tsx:338**

```ts
// avant
statValue: { fontSize: 22, fontFamily: FontFamily.black, letterSpacing: LetterSpacing.tight },
// après
statValue: { fontSize: 22, fontFamily: FontFamily.black, letterSpacing: LetterSpacing.tight },
```

`fontSize: 22` — `LetterSpacing.tight` (-0.3) est correct pour cette taille. Laisser tel quel.

- [ ] **Step 5: Appliquer dans ReadyScreen.tsx:65**

```bash
grep -n "fontSize: 32\|letterSpacing" components/onboarding/ReadyScreen.tsx
```

```ts
// avant
title: { fontSize: 32, fontFamily: FontFamily.black },
// après
title: { fontSize: 32, fontFamily: FontFamily.black, letterSpacing: LetterSpacing.tighter },
```

- [ ] **Step 6: Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreur.

- [ ] **Step 7: Commit**

```bash
git add app/constants/Typography.ts components/onboarding/SessionDemoScreen.tsx components/onboarding/ReadyScreen.tsx
git commit -m "feat(tokens): LetterSpacing display/hero négatifs + appliquer sur éléments Black"
```

---

## Task 5: Barres historiques → textDisabled

**Contexte :** `[exerciseId].tsx:200` utilise `'#1E40AF'` (dark) et `'#BFDBFE'` (light) pour les barres de l'historique d'un exercice. La charte design (voir CLAUDE.md section Progression) indique `barres chart #444444` = `colors.textDisabled` pour les barres non-actives. Le colorScheme-conditional est un anti-pattern ici : l'app est dark-first.

**Files:**
- Modify: `app/progression/[exerciseId].tsx:200`

- [ ] **Step 1: Lire le contexte**

```bash
sed -n '195,210p' app/progression/\[exerciseId\].tsx
```

Identifier la ligne avec `frontColor: i === history.length - 1 ? colors.primary : (colorScheme === 'dark' ? '#1E40AF' : '#BFDBFE')`.

- [ ] **Step 2: Remplacer**

```ts
// avant
frontColor: i === history.length - 1 ? colors.primary : (colorScheme === 'dark' ? '#1E40AF' : '#BFDBFE'),
// après
frontColor: i === history.length - 1 ? colors.primary : colors.textDisabled,
```

- [ ] **Step 3: Supprimer colorScheme si unused**

Vérifier si `colorScheme` est utilisé ailleurs dans ce fichier :

```bash
grep -n "colorScheme" app/progression/\[exerciseId\].tsx
```

Si cette ligne était la seule utilisation, supprimer l'import/déclaration de `colorScheme`.

- [ ] **Step 4: Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreur.

- [ ] **Step 5: Commit**

```bash
git add app/progression/\[exerciseId\].tsx
git commit -m "fix(tokens): barres historiques exercice → colors.textDisabled (dark-first)"
```

---

## Ordre d'exécution recommandé

T1 → T2 → T5 → T4 → T3

Rationale : T1 et T2 sont les plus petits et les moins risqués → warm-up. T5 est trivial. T4 modifie un fichier de tokens partagé → avant T3 pour éviter deux commits sur Typography.ts. T3 est le plus grand (script Node.js, 32 fichiers) → garder pour la fin avec son propre typecheck.

## Checklist finale

Après toutes les tâches, vérifier zéro valeur hardcodée :

```bash
cd app
# Radius
grep -rn "borderRadius: [0-9]" components/ app/ --include="*.tsx" | grep -v "borderRadius: 0\b" | grep -v "Radius\."

# fontWeight strings
grep -rn "fontWeight: '[0-9]" components/ app/ --include="*.tsx"

# couleurs hex sémantiques ciblées
grep -rn "'#22[Cc]55[Ee]'\|'#EF4444'\|'#ef4444'\|'#ca8a04'\|'#7c3aed'\|'#16a34a'\|'#dc2626'\|'#fef3c7'\|'#1E40AF'\|'#BFDBFE'" components/ app/ --include="*.tsx" | grep -v SemanticColors.ts
```

Attendu : 0 résultat sur chaque commande.
