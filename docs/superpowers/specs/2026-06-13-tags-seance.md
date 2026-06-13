# Spec — Tags séance

**Date :** 2026-06-13
**Statut :** Approuvé

---

## Contexte

Après chaque séance, l'utilisateur peut déjà indiquer son humeur (mood_after, 3 niveaux). On ajoute deux compléments : des tags prédéfinis multi-select (qualité, physique, perf, contexte) et un champ texte libre optionnel. Objectif : repérer des patterns sur la durée (fatigue récurrente, douleurs, séances écourtées).

---

## Design

### 1. Stockage — DB

**Migration v11 :**
```sql
ALTER TABLE session_logs ADD COLUMN tags TEXT;
```

- `tags TEXT` — slugs comma-separated, ex : `"fatigue_musculaire,pr_inattendu"`. NULL si aucun tag.
- `notes TEXT` — déjà présent depuis v1, jamais câblé en UI. On réutilise tel quel.

### 2. Tags prédéfinis

Définis dans `app/services/sessionTagsUtils.ts` :

```typescript
export type SessionTagSlug =
  | 'bonne_seance'
  | 'seance_difficile'
  | 'manque_motivation'
  | 'fatigue_musculaire'
  | 'douleur_articulaire'
  | 'manque_sommeil'
  | 'pr_inattendu'
  | 'en_dessous_attentes'
  | 'seance_ecourtee';

export interface SessionTag {
  slug: SessionTagSlug;
  label: string;
  category: 'ressenti' | 'physique' | 'perf' | 'contexte';
}

export const PREDEFINED_TAGS: SessionTag[] = [
  { slug: 'bonne_seance',        label: 'Bonne séance',           category: 'ressenti' },
  { slug: 'seance_difficile',    label: 'Séance difficile',       category: 'ressenti' },
  { slug: 'manque_motivation',   label: 'Manque de motivation',   category: 'ressenti' },
  { slug: 'fatigue_musculaire',  label: 'Fatigue musculaire',     category: 'physique' },
  { slug: 'douleur_articulaire', label: 'Douleur articulaire',    category: 'physique' },
  { slug: 'manque_sommeil',      label: 'Manque de sommeil',      category: 'physique' },
  { slug: 'pr_inattendu',        label: 'PR inattendu',           category: 'perf'     },
  { slug: 'en_dessous_attentes', label: 'En dessous de mes attentes', category: 'perf' },
  { slug: 'seance_ecourtee',     label: 'Séance écourtée',        category: 'contexte' },
];

export function parseTags(raw: string | null): SessionTagSlug[] {
  if (!raw) return [];
  const valid = PREDEFINED_TAGS.map(t => t.slug);
  return raw.split(',').filter((s): s is SessionTagSlug => valid.includes(s as SessionTagSlug));
}

export function serializeTags(tags: SessionTagSlug[]): string {
  return tags.join(',');
}
```

### 3. Repository

Interface `ISessionLogRepository` — ajouter :

```typescript
saveSessionMeta(id: number, tags: SessionTagSlug[], notes: string | null): Promise<void>;
```

`SQLiteSessionLogRepository` :
```sql
UPDATE session_logs SET tags = ?, notes = ? WHERE id = ?
```

`InMemorySessionLogRepository` — même signature, met à jour en mémoire.

### 4. SessionService

```typescript
async saveSessionMeta(
  sessionLogId: number,
  tags: SessionTagSlug[],
  notes: string | null,
): Promise<void> {
  await this.sessionLogRepo.saveSessionMeta(sessionLogId, tags, notes);
}
```

TDD — 2 tests :
- `saveSessionMeta` persiste tags + notes
- `saveSessionMeta` avec tableau vide + notes null → vide

### 5. UI — SummaryPhase

Nouvelle section entre la section humeur et le bouton "Retour au programme".

**Props ajoutées :**
```typescript
selectedTags?: SessionTagSlug[];
onTagToggle?: (slug: SessionTagSlug) => void;
notes?: string;
onNotesChange?: (text: string) => void;
```

**Rendu :**
```
┌─ Notes de séance ─────────────────────────────────┐
│ [Bonne séance] [Séance difficile] [Manque motiv.]  │
│ [Fatigue musc.] [Douleur artic.] [Manque sommeil]  │
│ [PR inattendu] [En dessous att.] [Séance écourtée] │
│                                                     │
│ ┌─ Observations… ──────────────────────────────┐   │
│ │                                              │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

- Chips en `flexWrap: 'wrap'`, même style que les mood chips (bordure, fond primary si sélectionné)
- `TextInput` multiline, maxLength=200, placeholder="Observations…"
- `accessibilityState={{ selected }}` sur chaque chip
- Aucune catégorie affichée — liste plate, ordre PREDEFINED_TAGS

### 6. Flux de données — `[workoutId].tsx`

```typescript
const [selectedTags, setSelectedTags] = useState<SessionTagSlug[]>([]);
const [sessionNotes, setSessionNotes] = useState('');

const handleTagToggle = useCallback((slug: SessionTagSlug) => {
  setSelectedTags(prev =>
    prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
  );
}, []);

const handleBack = useCallback(async () => {
  if (session.sessionLogId) {
    await makeServiceForCheck().saveSessionMeta(
      session.sessionLogId,
      selectedTags,
      sessionNotes.trim() || null,
    ).catch(console.error);
  }
  router.back();
}, [session.sessionLogId, selectedTags, sessionNotes, router]);
```

`handleBack` remplace le simple `router.back()` actuel.

`SummaryPhase` reçoit :
```tsx
<SummaryPhase
  ...
  selectedTags={selectedTags}
  onTagToggle={handleTagToggle}
  notes={sessionNotes}
  onNotesChange={setSessionNotes}
  onClose={handleBack}
/>
```

> **Note typage `onClose`** : `handleBack` est `async`. `SummaryPhase.onClose` est typé `() => void` — React Native accepte `() => Promise<void>` sur `onPress` sans erreur TS, mais pour éviter le lint, typer `onClose: () => void | Promise<void>`.
```
```

---

## Tests

### `sessionTagsUtils.test.ts`
- `parseTags(null)` → `[]`
- `parseTags('')` → `[]`
- `parseTags('bonne_seance,pr_inattendu')` → `['bonne_seance', 'pr_inattendu']`
- `parseTags('bonne_seance,valeur_inconnue')` → `['bonne_seance']` (filtre invalides)
- `serializeTags(['fatigue_musculaire'])` → `'fatigue_musculaire'`
- `serializeTags([])` → `''`

### `SessionService.test.ts`
- `saveSessionMeta` persiste tags sérialisés + notes
- `saveSessionMeta` avec `[]` + `null` → tags='' notes=null

---

## Architecture

| Fichier | Action |
|---|---|
| `app/db/schema.ts` | Migration v11 — `ALTER TABLE session_logs ADD COLUMN tags TEXT` |
| `app/db/types.ts` | `tags: string \| null` sur `SessionLog` |
| `app/services/sessionTagsUtils.ts` | Créer — `SessionTagSlug`, `PREDEFINED_TAGS`, `parseTags`, `serializeTags` |
| `app/services/sessionTagsUtils.test.ts` | Créer — 6 tests |
| `app/repositories/ISessionLogRepository.ts` | Ajouter `saveSessionMeta` |
| `app/repositories/SQLiteSessionLogRepository.ts` | Implémenter `saveSessionMeta` |
| `app/repositories/InMemorySessionLogRepository.ts` | Implémenter `saveSessionMeta` |
| `app/services/SessionService.ts` | Ajouter `saveSessionMeta` |
| `app/services/SessionService.test.ts` | 2 nouveaux tests |
| `app/components/session/SummaryPhase.tsx` | Section tags + champ notes |
| `app/app/session/[workoutId].tsx` | State tags/notes, handleTagToggle, handleBack async |

---

## Hors scope

- Affichage des tags dans un historique de séances (pas d'écran historique)
- Filtrage/recherche par tag
- Tags par exercice (seulement par séance)
- Enregistrement audio
