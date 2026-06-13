# Spec — RPE moyen en SummaryPhase

**Date :** 2026-06-13
**Statut :** Approuvé

---

## Contexte

RPE (Rating of Perceived Exertion) est collecté par set dans `RunningPhase` via 3 chips : Facile (3), Normal (6), Difficile (9). La valeur est persistée dans `set_logs.rpe`. Elle n'est jamais agrégée ni affichée à l'utilisateur après la séance.

Afficher l'effort ressenti moyen dans `SummaryPhase` donne un retour factuel et personnel sur l'intensité globale — sans comparaison, sans jugement.

---

## Règles de gestion

- **Source :** `set_logs.rpe` pour tous les sets de la session (`session_log_id`)
- **Exclusions :** sets avec `rpe === null` (l'utilisateur n'a pas coté) sont ignorés
- **Si aucun set coté :** retourner `null` → rien n'est affiché dans la SummaryPhase
- **Mapping moyenne → label :**
  - `< 4.5` → `'Facile'`
  - `4.5` à `< 7.5` → `'Normal'`
  - `≥ 7.5` → `'Difficile'`
- **Affichage :** inline sous la durée dans le hero, format : `"47 min · Effort : Normal"`
- **Si `rpeLabel` null :** la ligne affiche uniquement la durée (comportement actuel inchangé)

---

## Architecture

### Service — `SessionService.getSessionRPELabel(sessionLogId: number): Promise<'Facile' | 'Normal' | 'Difficile' | null>`

- `this.setLogRepo.findBySessionLogId(sessionLogId)` — méthode déjà disponible dans `ISetLogRepository`
- Filtre les sets avec `rpe !== null`
- Si aucun → retourne `null`
- Calcule la moyenne des valeurs RPE
- Applique le mapping et retourne le label

### `[workoutId].tsx`

- Nouvel état : `const [rpeLabel, setRpeLabel] = useState<'Facile' | 'Normal' | 'Difficile' | null>(null)`
- Appel dans le `useEffect` déclenché par `session.phase === 'summary'` (même pattern que `detectPlateaus`, lignes ~220-229)
- Passage de `rpeLabel` comme prop à `<SummaryPhase />`

### `SummaryPhase.tsx`

- Nouvelle prop : `rpeLabel?: 'Facile' | 'Normal' | 'Difficile' | null`
- Dans le hero, remplacer la ligne durée :

```tsx
<Text style={[styles.heroDuration, { color: colors.textSecondary }]}>
  {formatDuration(durationSeconds)}{rpeLabel ? ` · Effort : ${rpeLabel}` : ''}
</Text>
```

---

## Tests TDD — `SessionService.getSessionRPELabel`

5 cas :

1. **Aucun set en base** → retourne `null`
2. **Tous les sets ont `rpe = null`** → retourne `null`
3. **Moyenne RPE < 4.5** (ex: tous à 3) → retourne `'Facile'`
4. **Moyenne RPE ≥ 7.5** (ex: tous à 9) → retourne `'Difficile'`
5. **Moyenne RPE entre 4.5 et 7.5** (ex: mix 3 + 9 = moyenne 6) → retourne `'Normal'`

---

## Hors scope

- Historique RPE moyen par séance dans l'onglet Stats
- Tendance RPE sur plusieurs séances
- RPE par exercice (agrégat plus fin)
- Modifier les valeurs RPE Facile/Normal/Difficile
