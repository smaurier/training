# Tags séance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'utilisateur de taguer une séance (9 tags prédéfinis multi-select) et d'ajouter une note libre dans SummaryPhase, persistés en DB à la fermeture.

**Architecture:** Migration v11 ajoute `tags TEXT` sur `session_logs` (le champ `notes TEXT` existe déjà). `sessionTagsUtils.ts` expose les constantes et helpers. `saveSessionMeta` sur le repo et SessionService écrit les deux colonnes en un seul UPDATE. `[workoutId].tsx` gère l'état local et sauvegarde au press "Retour au programme".

**Tech Stack:** React Native, Expo SDK 54, TypeScript strict, expo-sqlite, Jest

---

## Fichiers

| Fichier | Action |
|---|---|
| `app/services/sessionTagsUtils.ts` | Créer — types, constantes, parseTags, serializeTags |
| `app/services/sessionTagsUtils.test.ts` | Créer — 6 tests TDD |
| `app/db/schema.ts` | Migration v11 — `tags TEXT` |
| `app/db/types.ts` | `tags: string \| null` sur SessionLog |
| `app/repositories/ISessionLogRepository.ts` | Ajouter `saveSessionMeta` + exclure `tags` de CreateSessionLogDto |
| `app/repositories/SQLiteSessionLogRepository.ts` | Implémenter `saveSessionMeta` + `tags: null` dans save() |
| `app/repositories/InMemorySessionLogRepository.ts` | Implémenter `saveSessionMeta` + `tags: null` dans save() |
| `app/services/SessionService.ts` | Ajouter `saveSessionMeta` |
| `app/services/SessionService.test.ts` | 2 nouveaux tests |
| `app/components/session/SummaryPhase.tsx` | Section tags + TextInput notes |
| `app/app/session/[workoutId].tsx` | State tags/notes, handleTagToggle, handleBack async |

---

### Task 1 : `sessionTagsUtils.ts` — types, constantes, helpers (TDD)

**Files:**
- Create: `app/services/sessionTagsUtils.ts`
- Create: `app/services/sessionTagsUtils.test.ts`

- [ ] **Step 1 : Écrire les tests (RED)**

Créer `app/services/sessionTagsUtils.test.ts` :

```typescript
import { parseTags, serializeTags, PREDEFINED_TAGS } from './sessionTagsUtils';

describe('parseTags', () => {
  it('null → []', () => expect(parseTags(null)).toEqual([]));
  it("'' → []", () => expect(parseTags('')).toEqual([]));
  it("'bonne_seance,pr_inattendu' → tableau valide", () =>
    expect(parseTags('bonne_seance,pr_inattendu')).toEqual(['bonne_seance', 'pr_inattendu']));
  it('filtre les slugs inconnus', () =>
    expect(parseTags('bonne_seance,slug_inconnu')).toEqual(['bonne_seance']));
});

describe('serializeTags', () => {
  it("['fatigue_musculaire'] → 'fatigue_musculaire'", () =>
    expect(serializeTags(['fatigue_musculaire'])).toBe('fatigue_musculaire'));
  it('[] → ""', () => expect(serializeTags([])).toBe(''));
});

describe('PREDEFINED_TAGS', () => {
  it('contient 9 tags', () => expect(PREDEFINED_TAGS).toHaveLength(9));
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="sessionTagsUtils.test" --no-coverage 2>&1 | tail -5
```
Attendu : FAIL — `Cannot find module './sessionTagsUtils'`

- [ ] **Step 3 : Créer `app/services/sessionTagsUtils.ts`**

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
  { slug: 'bonne_seance',        label: 'Bonne séance',              category: 'ressenti' },
  { slug: 'seance_difficile',    label: 'Séance difficile',          category: 'ressenti' },
  { slug: 'manque_motivation',   label: 'Manque de motivation',      category: 'ressenti' },
  { slug: 'fatigue_musculaire',  label: 'Fatigue musculaire',        category: 'physique' },
  { slug: 'douleur_articulaire', label: 'Douleur articulaire',       category: 'physique' },
  { slug: 'manque_sommeil',      label: 'Manque de sommeil',         category: 'physique' },
  { slug: 'pr_inattendu',        label: 'PR inattendu',              category: 'perf'     },
  { slug: 'en_dessous_attentes', label: 'En dessous de mes attentes',category: 'perf'     },
  { slug: 'seance_ecourtee',     label: 'Séance écourtée',           category: 'contexte' },
];

const VALID_SLUGS = new Set<string>(PREDEFINED_TAGS.map(t => t.slug));

export function parseTags(raw: string | null): SessionTagSlug[] {
  if (!raw) return [];
  return raw.split(',').filter((s): s is SessionTagSlug => VALID_SLUGS.has(s));
}

export function serializeTags(tags: SessionTagSlug[]): string {
  return tags.join(',');
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="sessionTagsUtils.test" --no-coverage 2>&1 | tail -5
```
Attendu : PASS — 7 tests

- [ ] **Step 5 : TypeScript check + commit**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app && git add app/services/sessionTagsUtils.ts app/services/sessionTagsUtils.test.ts && git commit -m "feat(tags): sessionTagsUtils — PREDEFINED_TAGS, parseTags, serializeTags (TDD)"
```

---

### Task 2 : DB migration v11 + types

**Files:**
- Modify: `app/db/schema.ts`
- Modify: `app/db/types.ts`

Pas de nouveaux tests — la migration est couverte par les tests d'intégration existants (InMemory).

- [ ] **Step 1 : Ajouter la migration v11 dans `app/db/schema.ts`**

À la fin du tableau `MIGRATIONS`, après la migration v10 :

```typescript
  // v11 — tags séance
  `ALTER TABLE session_logs ADD COLUMN tags TEXT;`,
```

- [ ] **Step 2 : Ajouter `tags` dans l'interface `SessionLog` dans `app/db/types.ts`**

Remplacer :
```typescript
  mood_after: 1 | 2 | 3 | null;
}
```
par :
```typescript
  mood_after: 1 | 2 | 3 | null;
  tags: string | null;
}
```

- [ ] **Step 3 : TypeScript check**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
```
Attendu : erreurs TS (les repos n'initialisent pas encore `tags`) — normal, on les fixe en T3.

- [ ] **Step 4 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/db/schema.ts app/db/types.ts && git commit -m "feat(db): migration v11 — tags TEXT sur session_logs"
```

---

### Task 3 : Repository — `saveSessionMeta` (SQLite + InMemory)

**Files:**
- Modify: `app/repositories/ISessionLogRepository.ts`
- Modify: `app/repositories/SQLiteSessionLogRepository.ts`
- Modify: `app/repositories/InMemorySessionLogRepository.ts`

- [ ] **Step 1 : Mettre à jour `ISessionLogRepository.ts`**

Remplacer :
```typescript
import type { SessionLog } from '../db/types';

export type CreateSessionLogDto = Omit<SessionLog, 'id' | 'ended_at' | 'status' | 'paused_position' | 'mood_after'>;

export interface ISessionLogRepository {
```
par :
```typescript
import type { SessionLog } from '../db/types';
import type { SessionTagSlug } from '../services/sessionTagsUtils';

export type CreateSessionLogDto = Omit<SessionLog, 'id' | 'ended_at' | 'status' | 'paused_position' | 'mood_after' | 'tags'>;

export interface ISessionLogRepository {
```

Ajouter `saveSessionMeta` à la fin de l'interface (avant le `}`) :
```typescript
  saveSessionMeta(id: number, tags: SessionTagSlug[], notes: string | null): Promise<void>;
```

- [ ] **Step 2 : Mettre à jour `InMemorySessionLogRepository.ts`**

Dans la méthode `save()`, ajouter `tags: null` :
```typescript
  async save(dto: CreateSessionLogDto): Promise<SessionLog> {
    const item: SessionLog = {
      ...dto, id: this.nextId++, ended_at: null, status: 'active', paused_position: null, mood_after: null, tags: null,
    };
    this.items.push(item);
    return item;
  }
```

Ajouter l'import en tête de fichier :
```typescript
import type { SessionTagSlug } from '../services/sessionTagsUtils';
import { serializeTags } from '../services/sessionTagsUtils';
```

Ajouter la méthode `saveSessionMeta` après `saveMoodAfter` :
```typescript
  async saveSessionMeta(id: number, tags: SessionTagSlug[], notes: string | null): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.tags = serializeTags(tags) || null;
      item.notes = notes;
    }
  }
```

- [ ] **Step 3 : Mettre à jour `SQLiteSessionLogRepository.ts`**

Ajouter l'import :
```typescript
import type { SessionTagSlug } from '../services/sessionTagsUtils';
import { serializeTags } from '../services/sessionTagsUtils';
```

Ajouter `tags: null` dans la méthode `save()` si elle construit un objet explicitement (sinon le SELECT retourne déjà la colonne). Ajouter la méthode après `saveMoodAfter` :
```typescript
  async saveSessionMeta(id: number, tags: SessionTagSlug[], notes: string | null): Promise<void> {
    const serialized = serializeTags(tags) || null;
    await this.db.runAsync(
      'UPDATE session_logs SET tags = ?, notes = ? WHERE id = ?',
      [serialized, notes, id],
    );
  }
```

- [ ] **Step 4 : TypeScript check + tests**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage 2>&1 | tail -5
```
Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 5 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/repositories/ISessionLogRepository.ts app/repositories/SQLiteSessionLogRepository.ts app/repositories/InMemorySessionLogRepository.ts && git commit -m "feat(repo): saveSessionMeta — tags + notes sur session_logs"
```

---

### Task 4 : `SessionService.saveSessionMeta` (TDD)

**Files:**
- Modify: `app/services/SessionService.ts`
- Modify: `app/services/SessionService.test.ts`

- [ ] **Step 1 : Écrire les tests (RED)**

Dans `app/services/SessionService.test.ts`, ajouter après le describe `SessionService.saveMoodAfter` :

```typescript
describe('SessionService.saveSessionMeta', () => {
  it('persiste tags sérialisés et notes', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    await service.saveSessionMeta(log.id, ['bonne_seance', 'pr_inattendu'], 'Super séance');
    const saved = await ctx.sessionLogRepo.findById(log.id);
    expect(saved?.tags).toBe('bonne_seance,pr_inattendu');
    expect(saved?.notes).toBe('Super séance');
  });

  it('accepte tableau vide et notes null', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    await service.saveSessionMeta(log.id, [], null);
    const saved = await ctx.sessionLogRepo.findById(log.id);
    expect(saved?.tags).toBeNull();
    expect(saved?.notes).toBeNull();
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="SessionService.test" --no-coverage 2>&1 | tail -8
```
Attendu : 2 failures — `saveSessionMeta is not a function`

- [ ] **Step 3 : Implémenter dans `SessionService.ts`**

Ajouter l'import en tête :
```typescript
import type { SessionTagSlug } from './sessionTagsUtils';
```

Ajouter la méthode après `saveMoodAfter` :
```typescript
  async saveSessionMeta(
    sessionLogId: number,
    tags: SessionTagSlug[],
    notes: string | null,
  ): Promise<void> {
    await this.sessionLogRepo.saveSessionMeta(sessionLogId, tags, notes);
  }
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="SessionService.test" --no-coverage 2>&1 | tail -5
```
Attendu : PASS (tous les tests + 2 nouveaux)

- [ ] **Step 5 : TypeScript check + commit**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app && git add app/services/SessionService.ts app/services/SessionService.test.ts && git commit -m "feat(session): SessionService.saveSessionMeta — tags + notes (TDD)"
```

---

### Task 5 : `SummaryPhase.tsx` — section tags + notes

**Files:**
- Modify: `app/components/session/SummaryPhase.tsx`

Pas de nouveaux tests — composant pur UI, couvert par les tests de snapshot si présents (aucun ici). Le threading est testé via T6.

- [ ] **Step 1 : Mettre à jour les imports**

Dans `app/components/session/SummaryPhase.tsx`, remplacer :
```typescript
import { View, Text, ScrollView, StyleSheet } from 'react-native';
```
par :
```typescript
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
```

Ajouter l'import sessionTagsUtils après les imports existants :
```typescript
import type { SessionTagSlug } from '@/services/sessionTagsUtils';
import { PREDEFINED_TAGS } from '@/services/sessionTagsUtils';
```

- [ ] **Step 2 : Mettre à jour l'interface `SummaryPhaseProps`**

Remplacer :
```typescript
interface SummaryPhaseProps {
  progressions: ProgressionResult[];
  totalSets: number;
  durationSeconds: number;
  totalVolumeKg?: number;
  plateaus?: PlateauResult[];
  suggestNextDeload?: boolean;
  onMoodSelect?: (mood: 1 | 2 | 3) => void;
  selectedMood?: 1 | 2 | 3;
  onClose: () => void;
}
```
par :
```typescript
interface SummaryPhaseProps {
  progressions: ProgressionResult[];
  totalSets: number;
  durationSeconds: number;
  totalVolumeKg?: number;
  plateaus?: PlateauResult[];
  suggestNextDeload?: boolean;
  onMoodSelect?: (mood: 1 | 2 | 3) => void;
  selectedMood?: 1 | 2 | 3;
  selectedTags?: SessionTagSlug[];
  onTagToggle?: (slug: SessionTagSlug) => void;
  notes?: string;
  onNotesChange?: (text: string) => void;
  onClose: () => void | Promise<void>;
}
```

- [ ] **Step 3 : Mettre à jour la signature de la fonction**

Remplacer :
```typescript
export function SummaryPhase({ progressions, totalSets, durationSeconds, totalVolumeKg, plateaus, suggestNextDeload, onMoodSelect, selectedMood, onClose }: SummaryPhaseProps) {
```
par :
```typescript
export function SummaryPhase({ progressions, totalSets, durationSeconds, totalVolumeKg, plateaus, suggestNextDeload, onMoodSelect, selectedMood, selectedTags = [], onTagToggle, notes = '', onNotesChange, onClose }: SummaryPhaseProps) {
```

- [ ] **Step 4 : Ajouter la section tags + notes dans le JSX**

Insérer entre la section humeur (`</View>` de moodSection) et le bouton "Retour au programme" :

```tsx
      <View style={[styles.tagsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes de séance</Text>
        <View style={styles.tagsWrap}>
          {PREDEFINED_TAGS.map(tag => (
            <PressableA11y
              key={tag.slug}
              accessibilityLabel={tag.label}
              accessibilityState={{ selected: selectedTags.includes(tag.slug) }}
              onPress={() => onTagToggle?.(tag.slug)}
              style={[
                styles.tagChip,
                { borderColor: colors.border },
                selectedTags.includes(tag.slug)
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[
                styles.tagLabel,
                { color: selectedTags.includes(tag.slug) ? '#fff' : colors.text },
              ]}>
                {tag.label}
              </Text>
            </PressableA11y>
          ))}
        </View>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          value={notes}
          onChangeText={onNotesChange}
          placeholder="Observations…"
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={200}
          accessibilityLabel="Notes de séance"
        />
      </View>
```

- [ ] **Step 5 : Ajouter les styles**

Dans `StyleSheet.create({...})`, ajouter après `moodLabel` :
```typescript
  tagsSection: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 12 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  tagLabel: { fontSize: 13, fontWeight: '500' },
  notesInput: { borderWidth: 1, borderRadius: Radius.sm, padding: 12, fontSize: 14, minHeight: 72, textAlignVertical: 'top' },
```

- [ ] **Step 6 : TypeScript check + commit**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app && git add app/components/session/SummaryPhase.tsx && git commit -m "feat(ui): SummaryPhase — section tags + champ notes"
```

---

### Task 6 : `[workoutId].tsx` — state, handleTagToggle, handleBack async

**Files:**
- Modify: `app/app/session/[workoutId].tsx`

- [ ] **Step 1 : Ajouter les imports**

Ajouter après les imports existants :
```typescript
import type { SessionTagSlug } from '@/services/sessionTagsUtils';
```

- [ ] **Step 2 : Ajouter state tags + notes dans `SessionContent`**

Après `const [selectedMood, setSelectedMood] = useState<1 | 2 | 3 | undefined>(undefined);`, ajouter :
```typescript
  const [selectedTags, setSelectedTags] = useState<SessionTagSlug[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');

  const handleTagToggle = useCallback((slug: SessionTagSlug) => {
    setSelectedTags(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  }, []);
```

- [ ] **Step 3 : Remplacer `handleBack` par la version async**

Remplacer :
```typescript
  const handleBack = useCallback(() => router.back(), [router]);
```
par :
```typescript
  const handleBack = useCallback(async () => {
    if (session.sessionLogId) {
      await makeServiceForCheck()
        .saveSessionMeta(session.sessionLogId, selectedTags, sessionNotes.trim() || null)
        .catch(console.error);
    }
    router.back();
  }, [session.sessionLogId, selectedTags, sessionNotes, router]);
```

- [ ] **Step 4 : Passer les nouvelles props à `<SummaryPhase>`**

Localiser le bloc `<SummaryPhase ... />` et remplacer :
```tsx
          <SummaryPhase
            progressions={session.progressions}
            totalSets={session.totalSetsLogged}
            durationSeconds={summaryDurationSeconds}
            totalVolumeKg={session.totalVolume}
            plateaus={plateaus}
            suggestNextDeload={deloadSuggested && !isDeloadSession}
            onMoodSelect={handleMoodSelect}
            selectedMood={selectedMood}
            onClose={handleBack}
          />
```
par :
```tsx
          <SummaryPhase
            progressions={session.progressions}
            totalSets={session.totalSetsLogged}
            durationSeconds={summaryDurationSeconds}
            totalVolumeKg={session.totalVolume}
            plateaus={plateaus}
            suggestNextDeload={deloadSuggested && !isDeloadSession}
            onMoodSelect={handleMoodSelect}
            selectedMood={selectedMood}
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
            notes={sessionNotes}
            onNotesChange={setSessionNotes}
            onClose={handleBack}
          />
```

- [ ] **Step 5 : TypeScript check + tests complets**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage 2>&1 | tail -5
```
Attendu : 0 erreurs, tous les tests passent.

- [ ] **Step 6 : ESLint check**

```bash
cd /c/Users/sylva/projects/training-app/app && npx eslint . --ext .ts,.tsx 2>&1 | grep error
```
Attendu : 0 erreurs (warnings pré-existants OK).

- [ ] **Step 7 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add "app/app/session/[workoutId].tsx" && git commit -m "feat(session): tags + notes séance — state, handleTagToggle, handleBack async"
```

---

## Self-Review

**Spec coverage :**
- ✅ Migration v11 `tags TEXT` → T2
- ✅ `notes TEXT` réutilisé (déjà en DB) → T3 (saveSessionMeta écrit les deux)
- ✅ `sessionTagsUtils.ts` — `SessionTagSlug`, `PREDEFINED_TAGS` (9 tags), `parseTags`, `serializeTags` → T1
- ✅ `saveSessionMeta` repo (SQLite + InMemory) → T3
- ✅ `SessionService.saveSessionMeta` TDD → T4
- ✅ SummaryPhase — chips flex-wrap + TextInput notes → T5
- ✅ `[workoutId].tsx` — state, handleTagToggle, handleBack async → T6
- ✅ `CreateSessionLogDto` exclut `tags` → T3 (ISessionLogRepository)
- ✅ `onClose: () => void | Promise<void>` → T5 (SummaryPhase props)

**Placeholders :** aucun.

**Type consistency :** `SessionTagSlug` défini en T1, importé en T3, T4, T5, T6. `serializeTags` défini en T1, utilisé en T3. `saveSessionMeta` signature cohérente entre ISessionLogRepository (T3), SessionService (T4), et l'appel dans [workoutId].tsx (T6).
