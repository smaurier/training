# Décharge automatique — Design

## Contexte

Après plusieurs semaines d'entraînement continu, la fatigue cumulée dépasse les capacités de récupération. Une semaine de décharge (charge réduite ~10%) permet aux muscles et tendons de récupérer et relance la progression. Cette feature détecte le moment opportun et suggère la décharge — sans l'imposer.

La fonction `applyDeload(weight)` et la décharge réactive (2 échecs consécutifs) existent déjà dans `progression.ts` et `SessionService`. Cette feature ajoute la décharge **proactive** (temps).

---

## Décisions de design

| Sujet | Décision | Raison |
|---|---|---|
| Déclencheur | Calendaire (N semaines depuis dernière décharge) | Scientifiquement validé (Israetel, Helms, Barbell Medicine) ; proactif, pas réactif |
| Seuil par défaut | 4 semaines | Standard intermédiaire — rythme LP élevé |
| Configurable | Oui — `deload_weeks` dans Réglages | Utilisateur avancé peut ajuster à 6 semaines |
| Scope décharge | Global (tout le programme) | Décharge = récupération systémique, pas par workout isolé |
| Stockage | Clés `deload_weeks` + `last_deload_at` dans `settings` KV existante | YAGNI — table déjà présente, repo déjà câblé |
| Signal | Double : SummaryPhase (anticipation) + CheckInPhase (décision) | Prime → action, pattern UX classique |
| Application | Auto via `applyDeload()` à confirmation, override toujours possible | Respecte autonomie utilisateur |
| Reset compteur | À la fin de la séance décharge (session complétée) | Évite reset si abandon |
| "Passer" | Per-séance seulement | Rappel à chaque CheckIn jusqu'à décharge effective |
| Copy | Factuel, additif, personnel | Philosophie UX CLAUDE.md — pas de culpabilité |

---

## Déclencheur — calcul

```
refDate = last_deload_at ?? earliest_completed_session(workoutId).started_at
daysSince = (now - refDate) / 86_400_000
shouldSuggest = daysSince >= deload_weeks * 7
```

- `last_deload_at` : clé globale dans `settings` (null si jamais déchargé)
- `deload_weeks` : clé globale dans `settings` (défaut `"4"`)
- Si aucune séance complétée → `shouldSuggest = false`

---

## Flow UX

### ① SummaryPhase — fin de la séance qui atteint le seuil

Card non-bloquante, positionnée après les progressions :

```
Tu t'entraînes depuis 4 semaines.
La prochaine séance, pense à décharger.
```

Affichée si `shouldSuggestDeload()` retourne `true` ET `isDeloadSession = false` (pas déjà en décharge).

### ② CheckInPhase — début de la séance suivante

Card avec explication, au-dessus du bouton "Commencer" :

```
Semaine de décharge suggérée

Après plusieurs semaines d'entraînement, une semaine à charge réduite
(-10%) permet aux muscles et tendons de récupérer et de repartir plus forts.

[Appliquer la décharge]  [Passer]
```

- "Appliquer" → `isDeloadSession = true`, CheckIn continue normalement
- "Passer" → card disparaît pour cette séance, réapparaît à la prochaine

### ③ RunningPhase — si `isDeloadSession = true`

- Bannière subtile en haut : *"Séance décharge"*
- Poids cibles = `applyDeload(weight)` pour chaque exercice (avant affichage)
- Override barbell toujours disponible

### ④ Fin de séance décharge — session complétée

- `settings.set('last_deload_at', now.toISOString())` → compteur repart
- Si abandon : pas de reset

---

## Architecture

### Nouveau service : `app/services/DeloadService.ts`

```typescript
export class DeloadService {
  constructor(
    private settingsRepo: ISettingsRepository,
    private sessionLogRepo: ISessionLogRepository,
  ) {}

  async shouldSuggestDeload(workoutId: number): Promise<boolean>
  async getDeloadWeeks(): Promise<number>         // parse "deload_weeks", default 4
  async recordDeload(date: string): Promise<void> // set "last_deload_at"
}
```

### Fichiers touchés

| Fichier | Action |
|---|---|
| `app/services/DeloadService.ts` | Créer |
| `app/services/DeloadService.test.ts` | Créer (TDD) |
| `app/components/session/CheckInPhase.tsx` | Prop `deloadSuggested?` + card décision |
| `app/components/session/SummaryPhase.tsx` | Prop `suggestNextDeload?` + card anticipation |
| `app/app/session/[workoutId].tsx` | State `isDeloadSession` + appels DeloadService |
| `app/app/(tabs)/reglages.tsx` | Input `deload_weeks` (nombre de semaines) |

**Pas de migration DB** — `settings` table créée en v1, KV pattern déjà utilisé (thème, unités).

### État de séance

`isDeloadSession: boolean` ajouté au state local de `[workoutId].tsx` (comme `plateaus`). Pas besoin de persistance — déterminé à chaque CheckIn.

---

## `applyDeload` — existant, réutilisé

```typescript
// app/services/progression.ts — déjà là
export function applyDeload(weight: number): number {
  return Math.floor((weight * 0.9) / 2) * 2;
}
```

Appliqué dans `RunningPhase` sur les poids cibles si `isDeloadSession = true`.

---

## Copy — filtre UX

| Copy | Factuel | Additif | Personnel |
|---|---|---|---|
| "Tu t'entraînes depuis 4 semaines" | ✓ | ✓ | ✓ |
| "Pense à décharger" | ✓ | ✓ | ✓ |
| "permet de repartir plus forts" | ✓ | ✓ | ✓ |
| "Séance décharge" | ✓ | ✓ | ✓ |

Aucun rouge, aucun score, aucune comparaison. Conforme philosophie UX CLAUDE.md.

---

## Hors scope

- Décharge par RPE ou par exercice isolé → V3
- Notification push "n'oublie pas de décharger" → V3
- Historique des décharges → V3
- Décharge per-workout (compteurs séparés) → V3 si besoin confirmé terrain
