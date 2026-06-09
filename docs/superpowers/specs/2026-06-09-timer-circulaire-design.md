# Timer Circulaire SVG — Design

## Goal

Remplacer les timers texte + barre horizontale par un arc SVG circulaire avec valeur numérique au centre. Applicable sur RestPhase (repos inter-séries) et RunningPhase mode durée (étirements/mobilité).

## Architecture

Nouveau composant réutilisable `CircularTimer` dans `components/ui/`. Modifie uniquement `RestPhase` et `RunningPhase` — aucune logique métier, aucun hook touché.

## Fichiers

| Action | Fichier |
|--------|---------|
| Créer | `app/components/ui/CircularTimer.tsx` |
| Modifier | `app/components/session/RestPhase.tsx` |
| Modifier | `app/components/session/RunningPhase.tsx` |

## Composant `CircularTimer`

### Props

```ts
interface CircularTimerProps {
  progress: number;     // 0–1 : 1 = plein, 0 = vide
  remaining: number;    // secondes affichées au centre
  label?: string;       // texte sous la valeur (ex: "REPOS", "EN COURS…")
  size?: number;        // diamètre en px, défaut 160
}
```

### Rendu SVG

Arc via `stroke-dasharray` / `stroke-dashoffset` sur `react-native-svg` (déjà installé).

```
radius = (size / 2) - strokeWidth / 2
circumference = 2 * π * radius
strokeDashoffset = circumference * (1 - progress)
rotation: -90° pour démarrer en haut
stroke-linecap: round
```

### Couleur de l'arc

```ts
function arcColor(progress: number): string {
  if (progress <= 0) return '#16a34a';   // terminé → vert
  if (progress > 0.6) return '#16a34a';  // vert
  if (progress > 0.3) return '#f59e0b';  // orange
  return '#ef4444';                       // rouge
}
```

### Structure interne

```
<Svg width={size} height={size}>
  <G rotation="-90" origin={`${cx}, ${cy}`}>
    {/* Track gris */}
    <Circle ... stroke={trackColor} strokeWidth={10} fill="none" />
    {/* Arc coloré */}
    <Circle ... stroke={arcColor(progress)} strokeDasharray={circumference}
            strokeDashoffset={offset} strokeLinecap="round" fill="none" />
  </G>
  {/* Valeur numérique */}
  <SvgText x={cx} y={cy - 6} textAnchor="middle" ... >{formatTime(remaining)}</SvgText>
  {/* Label */}
  <SvgText x={cx} y={cy + 18} textAnchor="middle" ...>{label}</SvgText>
</Svg>
```

Pas de `accessibilityLabel` sur le SVG — le composant parent fournit l'accessibilité texte.

## RestPhase

Supprime :
- `timerText` (72px, le grand nombre)
- `progressTrack` + `progressFill` (barre horizontale)

Ajoute :
```tsx
<CircularTimer
  progress={progress}
  remaining={timer.remaining}
  label={isDone ? "C'EST PARTI" : 'REPOS'}
  size={200}
/>
```

`progress` déjà calculé : `durationSeconds > 0 ? timer.remaining / durationSeconds : 0`.

Bouton, `nextLabel`, fond vert terminé — inchangés.

## RunningPhase (mode durée)

Supprime :
- `timerContainer` (la box avec `countdown` + label "EN COURS…" / "TERMINÉ ✓")

Ajoute :
```tsx
<CircularTimer
  progress={countdown / (set.duration_seconds ?? 1)}
  remaining={countdown}
  label={timerDone ? 'TERMINÉ ✓' : 'EN COURS…'}
  size={160}
/>
```

Bouton "Lancer ▶" / "C'est fait" — inchangé.

## Tests

Pas de tests unitaires pour le composant SVG (rendu visuel pur). Vérification : typecheck + revue visuelle sur device/simulateur.

## Décisions

- `size=200` RestPhase (écran dédié, centré), `size=160` RunningPhase (partagé avec cible + boutons).
- Track color : `colors.border` (thème light/dark automatique).
- Texte SVG via `<SvgText>` de `react-native-svg` — pas de `<Text>` RN à l'intérieur du SVG.
- Le CHRONO de RestPhase (mode reps) n'est pas touché — hors scope.
