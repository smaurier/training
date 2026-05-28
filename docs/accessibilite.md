# Accessibilité — Training App

Référentiel formel d'accessibilité du projet. Toute fonctionnalité implementée doit satisfaire ces critères avant d'être considérée terminée.

---

## Référentiels applicables

| Référentiel | Version | Périmètre |
|---|---|---|
| WCAG | 2.2 | Critères applicables mobile (interface tactile) |
| EN 301 549 | V3.2.1 (2021) | Norme européenne — inclut WCAG 2.2 + clauses mobile natives |
| Apple HIG Accessibility | 2024 | iOS/iPadOS — VoiceOver, Dynamic Type, Switch Control |
| Android Accessibility | Material 3 | TalkBack, AccessibilityNodeInfo, Touch Exploration |
| APPT Foundation | — | Recommandations pratiques mobile natif |

**Niveau cible** : WCAG 2.2 AA (obligatoire) + AAA sur les critères raisonnablement atteignables.

---

## 1. Perceptible (WCAG Principe 1)

### 1.1 Alternatives textuelles — Critère 1.1.1 (AA)

Tout élément non-textuel a une alternative textuelle.

**React Native :**
```tsx
// ✅ Icon button avec label
<Pressable accessibilityLabel="Créer un programme" accessibilityRole="button">
  <Ionicons name="add" />
</Pressable>

// ✅ Image décorative (ignorée par lecteur d'écran)
<Image accessible={false} />

// ✅ Image informative
<Image accessibilityLabel="Photo de l'exercice : développé couché" />
```

**Règle** : `accessibilityLabel` obligatoire sur tout `Pressable`, `TouchableOpacity`, `Image` non décorative.

---

### 1.2 Contrastes — Critère 1.4.3 / 1.4.6 (AA / AAA)

| Contexte | Ratio minimum AA | Ratio minimum AAA |
|---|---|---|
| Texte normal (< 18pt / < 14pt bold) | 4.5:1 | 7:1 |
| Texte large (≥ 18pt / ≥ 14pt bold) | 3:1 | 4.5:1 |
| Composants UI (bordures, icônes) | 3:1 | — |

**Palette du projet** (à compléter selon `constants/Colors.ts`) :
- Texte primaire sur fond blanc : vérifier avec [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)
- Boutons CTA : fond + texte ≥ 4.5:1
- Placeholders : souvent trop pâles — valider séparément (critère 1.4.3 s'applique)

---

### 1.3 Adaptabilité — Critère 1.3.1 / 1.3.4 (AA)

**Structure sémantique** :
```tsx
// ✅ Rôles corrects
<View accessibilityRole="header">      // en-tête de section
<View accessibilityRole="list">        // liste (FlatList)
<Pressable accessibilityRole="button"> // bouton
<Pressable accessibilityRole="link">   // navigation
<TextInput accessibilityRole="search"> // champ recherche
```

**Orientation** : l'app ne doit pas verrouiller l'orientation (critère 1.3.4 AA).
- Expo : vérifier `orientation` dans `app.json` — préférer `"default"` ou `"all"`.

---

### 1.4 Redimensionnement du texte — Critère 1.4.4 (AA)

Le texte doit rester lisible à 200% (Dynamic Type iOS / Font Scale Android).

```tsx
// ✅ allowFontScaling activé par défaut sur Text — ne pas désactiver
<Text allowFontScaling={true}>...</Text>  // défaut RN

// ❌ À éviter
<Text allowFontScaling={false}>...</Text>

// ✅ Conteneurs flexibles — pas de hauteur fixe sur les lignes de texte
// Utiliser minHeight plutôt que height pour les touch targets
```

---

### 1.4.10 Reflow — Critère 1.4.10 (AA)

Contenu doit s'adapter sans scroll horizontal à 320px de large CSS (= ~320pt).
React Native avec Flexbox satisfait naturellement ce critère si pas de `width` fixe en pixels absolus.

---

### 1.4.11 Contraste des composants UI — Critère 1.4.11 (AA)

Icônes, bordures de champs, indicateurs d'état : ratio ≥ 3:1 par rapport au fond adjacent.

---

## 2. Utilisable (WCAG Principe 2)

### 2.1 Clavier / Switch Control — Critère 2.1.1 (AA)

Toutes les fonctionnalités accessibles sans geste complexe. Sur iOS : Switch Control. Sur Android : navigation clavier externe.

**React Native** : la navigation par focus suit l'ordre DOM par défaut. Ajuster avec `accessibilityViewIsModal` sur les modals.

```tsx
// ✅ Modal accessible — focus piégé dans la modal
<Modal visible={open} accessibilityViewIsModal={true}>
  ...
</Modal>
```

---

### 2.4 Navigation — Critères 2.4.3 / 2.4.6 / 2.4.7 (AA)

**Ordre du focus (2.4.3)** : logique haut-gauche vers bas-droite, correspondant à l'ordre visuel.

**En-têtes et labels (2.4.6)** : chaque écran a un titre accessible.
```tsx
// ✅ Titre d'écran lu par VoiceOver/TalkBack
<Stack.Screen options={{ title: "Mes programmes" }} />
```

**Focus visible (2.4.7)** : sur Android le focus clavier est visible nativement. Sur iOS, VoiceOver dessine un cadre. Ne pas désactiver ces comportements.

---

### 2.5 Modalités d'entrée — Critères 2.5.3 / 2.5.8 (AA)

**Étiquette dans le nom (2.5.3)** : le texte visible d'un bouton doit être inclus dans son `accessibilityLabel`.
```tsx
// ✅
<Pressable accessibilityLabel="Ajouter un programme">
  <Text>Ajouter</Text>
</Pressable>

// ❌ Label ne contient pas le texte visible
<Pressable accessibilityLabel="Créer">
  <Text>Ajouter</Text>
</Pressable>
```

**Taille cible (2.5.8 AA, ajout WCAG 2.2)** : touch target minimum 24×24 CSS px. Recommandé : 44×44pt iOS / 48×48dp Android.
```tsx
// ✅
const styles = StyleSheet.create({
  touchTarget: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  }
})
```

---

## 3. Compréhensible (WCAG Principe 3)

### 3.1 Langue — Critère 3.1.1 (AA)

Spécifier la langue de l'app dans les métadonnées Expo :
```json
// app.json
{
  "expo": {
    "locales": {
      "fr": "./locales/fr.json"
    }
  }
}
```

---

### 3.2 Prévisibilité — Critère 3.2.1 / 3.2.2 (AA)

- Pas de changement de contexte au focus (3.2.1)
- Pas de changement de contexte automatique à la saisie (3.2.2) — ex: ne pas naviguer dès qu'un champ change

---

### 3.3 Assistance à la saisie — Critère 3.3.1 / 3.3.2 (AA)

**Erreurs identifiées (3.3.1)** :
```tsx
// ✅ Erreur de validation accessible
<Text
  accessibilityRole="alert"
  accessibilityLiveRegion="polite"
>
  {error}
</Text>
```

**Labels (3.3.2)** : tous les champs ont un label visible ou `accessibilityLabel`.
```tsx
// ✅
<TextInput
  accessibilityLabel="Nom du programme"
  placeholder="ex : Push A"
/>
```

---

## 4. Robuste (WCAG Principe 4)

### 4.1 Compatible — Critère 4.1.2 / 4.1.3 (AA)

**Nom, Rôle, Valeur (4.1.2)** : chaque composant expose correctement son état.
```tsx
// ✅ État accessible
<Pressable
  accessibilityRole="button"
  accessibilityState={{ disabled: isLoading }}
  accessibilityLabel="Sauvegarder"
>

// ✅ Checkbox / toggle
<Pressable
  accessibilityRole="checkbox"
  accessibilityState={{ checked: isSelected }}
>
```

**Messages de statut (4.1.3)** : les mises à jour dynamiques sont annoncées.
```tsx
import { AccessibilityInfo } from 'react-native'

// ✅ Annonce une action réussie sans déplacer le focus
AccessibilityInfo.announceForAccessibility('Programme sauvegardé')
```

---

## 5. Clauses mobiles — EN 301 549

Clauses spécifiques à la norme européenne EN 301 549 au-delà de WCAG.

### 5.1.3 Accès sans interface vocale

L'app ne doit pas être exclusive à la voix. Toutes les actions sont disponibles via touch et/ou clavier.

### 5.9 Actions simultanées

Aucune action ne doit requérir deux pointeurs simultanés (ex: pinch) sans alternative.

### 6.x Appels vocaux

Non applicable — l'app ne fait pas d'appels.

### 11.x Documentation

Toute documentation (ce fichier, specs.md) doit elle-même être accessible (structure avec headings, pas d'information véhiculée uniquement par la couleur).

---

## 6. iOS — VoiceOver

### Checklist VoiceOver

| Critère | Comment valider |
|---|---|
| Tous les éléments interactifs sont focusables | Swipe VoiceOver droit jusqu'à tous les atteindre |
| Les labels sont lus correctement | Écouter — pas de "button button" ou label technique |
| L'ordre de focus est logique | Swipe séquentiel = ordre visuel haut→bas |
| Les modals piègent le focus | Swipe ne sort pas de la modal |
| Les alertes sont annoncées | `accessibilityLiveRegion` déclenche lecture auto |
| Gestes custom ont une alternative | Pas de swipe propriétaire sans bouton équivalent |

### Props iOS-spécifiques

```tsx
// Regrouper des éléments en un seul nœud accessible
<View accessible={true} accessibilityLabel="Programme Push A, 3 séances">
  <Text>Push A</Text>
  <Text>3 séances</Text>
</View>

// Masquer aux lecteurs d'écran (éléments purement décoratifs)
<View importantForAccessibility="no-hide-descendants">
  <Ionicons name="chevron-right" />
</View>
```

---

## 7. Android — TalkBack

### Checklist TalkBack

| Critère | Comment valider |
|---|---|
| Tous les éléments interactifs sont focusables | Exploration au toucher |
| Les `contentDescription` sont présents | Équivalent Android de `accessibilityLabel` |
| L'ordre de focus respecte la hiérarchie | TalkBack suit l'arbre de vues |
| `importantForAccessibility` défini | `auto`, `yes`, `no`, `no-hide-descendants` |

### Props Android-spécifiques

```tsx
// React Native mappe accessibilityLabel → contentDescription sur Android
// Pas besoin de différenciation sauf cas edge

// Android Live Region
<Text accessibilityLiveRegion="polite">
  {statusMessage}
</Text>
```

---

## 8. Règles de développement — récapitulatif

### Obligatoire sur chaque composant interactif

```tsx
accessibilityLabel="..."    // texte lu par le lecteur d'écran
accessibilityRole="..."     // button | link | header | checkbox | ...
accessibilityHint="..."     // (optionnel mais recommandé) action attendue
accessibilityState={{ ... }} // disabled, checked, selected, busy, expanded
```

### Touch targets

```tsx
minHeight: 44  // iOS HIG
minWidth: 44
// ou padding équivalent si l'élément est plus petit visuellement
```

### Contrastes

- Aucune couleur définie inline dans StyleSheet
- Toutes les couleurs passent par `constants/Colors.ts`
- Chaque couleur déclarée dans `Colors.ts` doit être testée avec un outil de contraste

### Annonces dynamiques

```tsx
import { AccessibilityInfo } from 'react-native'
AccessibilityInfo.announceForAccessibility('message')
```

### Tests manuels obligatoires avant merge

1. VoiceOver iOS : navigation complète de l'écran au swipe
2. TalkBack Android : navigation complète de l'écran au toucher
3. Dynamic Type : tester à 200% (Réglages iOS → Accessibilité → Taille du texte)
4. Contraste : Colour Contrast Analyser sur les captures d'écran clés

---

## 9. Outils

| Outil | Usage |
|---|---|
| VoiceOver (iOS intégré) | Test lecteur d'écran iOS |
| TalkBack (Android intégré) | Test lecteur d'écran Android |
| Accessibility Inspector (Xcode) | Audit arbre d'accessibilité iOS |
| Layout Inspector (Android Studio) | Audit arbre d'accessibilité Android |
| Colour Contrast Analyser (TPGI) | Vérification ratios de contraste |
| React Native Accessibility Linter | Détection statique des violations |
| axe-core/react-native | Tests automatisés d'accessibilité |

---

## 10. Critères WCAG 2.2 — applicabilité mobile

| Critère | Niveau | Applicable mobile | Notes |
|---|---|---|---|
| 1.1.1 Contenu non textuel | AA | ✅ | Images, icônes |
| 1.3.1 Information et relations | AA | ✅ | Rôles sémantiques |
| 1.3.4 Orientation | AA | ✅ | Ne pas verrouiller |
| 1.4.3 Contraste (minimum) | AA | ✅ | 4.5:1 / 3:1 |
| 1.4.4 Redimensionnement du texte | AA | ✅ | Dynamic Type |
| 1.4.10 Reflow | AA | ✅ | 320px |
| 1.4.11 Contraste des composants | AA | ✅ | Bordures, icônes |
| 2.1.1 Clavier | AA | ✅ | Switch Control / clavier ext. |
| 2.4.3 Ordre du focus | AA | ✅ | |
| 2.4.6 En-têtes et labels | AA | ✅ | Titres d'écran |
| 2.4.7 Focus visible | AA | ✅ | Ne pas masquer |
| 2.5.3 Étiquette dans le nom | AA | ✅ | Label ⊇ texte visible |
| 2.5.8 Taille de la cible | AA | ✅ | 24×24 min, 44×44 recommandé |
| 3.3.1 Identification des erreurs | AA | ✅ | `accessibilityRole="alert"` |
| 3.3.2 Étiquettes ou instructions | AA | ✅ | Labels de champs |
| 4.1.2 Nom, rôle, valeur | AA | ✅ | `accessibilityState` |
| 4.1.3 Messages d'état | AA | ✅ | `announceForAccessibility` |

---

*Dernière mise à jour : Session 7 — 2026-05-28*
