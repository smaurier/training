# Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wizard d'onboarding au premier lancement — 7 écrans, architecture single-route, démo séance interactive, réglages configurables inline.

**Architecture:** Route `app/onboarding.tsx` contient le wizard complet. Array `SCREENS` avec skip conditions (fonction pure testée). State local `wizardState` (objectif + programId choisi). Chaque écran = composant isolé dans `components/onboarding/`. `_layout.tsx` redirige vers `/onboarding` si flag `onboarding_done` absent de la DB.

**Tech Stack:** React Native, Expo Router, SQLite (`SQLiteSettingsRepository`), `TemplateService.importTemplate`, `usePrograms`, `useUnits`, `ThemeContext`.

---

## Fichiers

### Nouveaux
```
app/services/onboardingUtils.ts          — shouldSkip pure function
app/app/onboarding.tsx                   — wizard shell, SCREENS array, WizardState
app/components/onboarding/PhilosophyScreen.tsx
app/components/onboarding/ObjectiveScreen.tsx
app/components/onboarding/ProgramScreen.tsx
app/components/onboarding/SessionDemoScreen.tsx
app/components/onboarding/SettingsIntroScreen.tsx
app/components/onboarding/ProgressionScreen.tsx
app/components/onboarding/ReadyScreen.tsx
```

### Modifiés
```
app/app/_layout.tsx               — load onboarding_done, pass flag à RootLayoutNav, register route
app/app/(tabs)/reglages.tsx       — bouton "Revoir l'onboarding" + icônes aide (?)
```

### Tests
```
app/repositories/onboardingUtils.test.ts
```

---

## Task 1: `shouldSkip` pure function (TDD)

**Files:**
- Create: `app/services/onboardingUtils.ts`
- Create: `app/repositories/onboardingUtils.test.ts`

- [ ] **Écrire le test RED**

```ts
// app/repositories/onboardingUtils.test.ts
import { shouldSkip } from '../services/onboardingUtils';
import type { Program } from '../db/types';

const noPrograms: Program[] = [];
const oneProgram: Program[] = [
  { id: 1, name: 'PPL', description: null, is_active: 1, created_at: '', template_id: 'ppl-3j' },
];

describe('shouldSkip', () => {
  it('program: skip si programs.length > 0 et pas review', () => {
    expect(shouldSkip('program', oneProgram, false)).toBe(true);
  });
  it('program: ne skip pas si programs.length > 0 et review=true', () => {
    expect(shouldSkip('program', oneProgram, true)).toBe(false);
  });
  it('program: ne skip pas si programs vide', () => {
    expect(shouldSkip('program', noPrograms, false)).toBe(false);
  });
  it('program: ne skip pas si programs vide + review', () => {
    expect(shouldSkip('program', noPrograms, true)).toBe(false);
  });
  it('philosophy: jamais skip', () => {
    expect(shouldSkip('philosophy', oneProgram, false)).toBe(false);
  });
  it('ready: jamais skip', () => {
    expect(shouldSkip('ready', oneProgram, false)).toBe(false);
  });
  it('session-demo: jamais skip', () => {
    expect(shouldSkip('session-demo', oneProgram, false)).toBe(false);
  });
});
```

- [ ] **Run test → RED**

```bash
cd app && npx jest onboardingUtils --no-coverage
```
Attendu : `Cannot find module '../services/onboardingUtils'`

- [ ] **Implémenter**

```ts
// app/services/onboardingUtils.ts
import type { Program } from '../db/types';

export type OnboardingScreenId =
  | 'philosophy'
  | 'objective'
  | 'program'
  | 'session-demo'
  | 'settings-intro'
  | 'progression'
  | 'ready';

export function shouldSkip(
  screenId: OnboardingScreenId,
  programs: Program[],
  isReview: boolean,
): boolean {
  if (screenId === 'program') {
    return programs.length > 0 && !isReview;
  }
  return false;
}
```

- [ ] **Run test → GREEN**

```bash
cd app && npx jest onboardingUtils --no-coverage
```
Attendu : 7 tests PASS

- [ ] **Commit**

```bash
git add app/services/onboardingUtils.ts app/repositories/onboardingUtils.test.ts
git commit -m "feat(onboarding): shouldSkip pure function TDD"
```

---

## Task 2: `_layout.tsx` — check `onboarding_done`, redirect

**Files:**
- Modify: `app/app/_layout.tsx`

- [ ] **Modifier `RootLayout` pour charger `onboarding_done`**

Dans `RootLayout`, dans l'effet `initDatabase`, ajouter `onboarding_done` au chargement :

```ts
// Ajouter avec les autres états
const [onboardingDone, setOnboardingDone] = useState(false);

// Dans le useEffect initDatabase, remplacer le Promise.all :
const [theme, units, onbDone] = await Promise.all([
  settingsRepo.get('theme'),
  settingsRepo.get('units'),
  settingsRepo.get('onboarding_done'),
]);
setInitialTheme((theme as ThemePreference | null) ?? 'system');
setInitialUnits((units as UnitsPreference | null) ?? 'system');
setOnboardingDone(onbDone === 'true');
```

- [ ] **Passer `onboardingDone` à `RootLayoutNav`**

```tsx
// Modifier le return de RootLayout :
return (
  <ThemeContextProvider initialPreference={initialTheme} repo={settingsRepo}>
    <UnitsContextProvider initialPreference={initialUnits} repo={settingsRepo}>
      <RootLayoutNav onboardingDone={onboardingDone} />
    </UnitsContextProvider>
  </ThemeContextProvider>
);
```

- [ ] **Modifier `RootLayoutNav` pour rediriger**

```tsx
function RootLayoutNav({ onboardingDone }: { onboardingDone: boolean }) {
  const themeCtx = useContext(ThemeContext)!;
  const url = useURL();
  const router = useRouter();
  const lastImportedUrl = useRef<string | null>(null);

  // Redirect to onboarding if not done
  useEffect(() => {
    if (!onboardingDone) {
      router.replace('/onboarding');
    }
  }, [onboardingDone, router]);

  // ... reste du code useEffect url existant inchangé ...

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
      <ThemeProvider value={themeCtx.resolved === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          {/* ... autres screens existants inchangés ... */}
        </Stack>
      </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Typecheck**

```bash
cd app && npm run typecheck
```
Attendu : 0 errors

- [ ] **Commit**

```bash
git add app/app/_layout.tsx
git commit -m "feat(onboarding): redirect to /onboarding if flag absent"
```

---

## Task 3: `app/onboarding.tsx` — wizard shell

**Files:**
- Create: `app/app/onboarding.tsx`

- [ ] **Créer le wizard shell**

```tsx
// app/app/onboarding.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePrograms } from '@/hooks/usePrograms';
import { shouldSkip } from '@/services/onboardingUtils';
import type { OnboardingScreenId } from '@/services/onboardingUtils';
import { getDb } from '@/db';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';

import { PhilosophyScreen } from '@/components/onboarding/PhilosophyScreen';
import { ObjectiveScreen } from '@/components/onboarding/ObjectiveScreen';
import { ProgramScreen } from '@/components/onboarding/ProgramScreen';
import { SessionDemoScreen } from '@/components/onboarding/SessionDemoScreen';
import { SettingsIntroScreen } from '@/components/onboarding/SettingsIntroScreen';
import { ProgressionScreen } from '@/components/onboarding/ProgressionScreen';
import { ReadyScreen } from '@/components/onboarding/ReadyScreen';

export type Objective = 'force' | 'hypertrophie' | 'maintien' | 'cardio' | null;

export type WizardState = {
  objective: Objective;
  selectedProgramId: number | null;
};

export type ScreenProps = {
  wizardState: WizardState;
  setWizardState: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
  isReview: boolean;
  isFirst: boolean;
  isLast: boolean;
};

const ALL_SCREENS: { id: OnboardingScreenId; component: React.ComponentType<ScreenProps> }[] = [
  { id: 'philosophy',    component: PhilosophyScreen },
  { id: 'objective',     component: ObjectiveScreen },
  { id: 'program',       component: ProgramScreen },
  { id: 'session-demo',  component: SessionDemoScreen },
  { id: 'settings-intro',component: SettingsIntroScreen },
  { id: 'progression',   component: ProgressionScreen },
  { id: 'ready',         component: ReadyScreen },
];

export default function OnboardingScreen() {
  const { review } = useLocalSearchParams<{ review?: string }>();
  const isReview = review === 'true';
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { programs } = usePrograms();

  const [step, setStep] = useState(0);
  const [wizardStateRaw, setWizardStateRaw] = useState<WizardState>({
    objective: null,
    selectedProgramId: null,
  });

  const setWizardState = (patch: Partial<WizardState>) =>
    setWizardStateRaw(prev => ({ ...prev, ...patch }));

  const activeScreens = useMemo(
    () => ALL_SCREENS.filter(s => !shouldSkip(s.id, programs, isReview)),
    [programs, isReview],
  );

  const handleNext = async () => {
    if (step < activeScreens.length - 1) {
      setStep(s => s + 1);
      return;
    }
    // Dernier écran — terminer
    if (!isReview) {
      const repo = new SQLiteSettingsRepository(getDb());
      await repo.set('onboarding_done', 'true');
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const current = activeScreens[step];
  const Component = current.component;
  // Philosophy screen (index 0) = pas de dots
  const showDots = step > 0 || current.id !== 'philosophy';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {showDots && (
        <View style={styles.dotsRow}>
          {activeScreens.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === step ? colors.primary : colors.border },
              ]}
            />
          ))}
        </View>
      )}
      <Component
        wizardState={wizardStateRaw}
        setWizardState={setWizardState}
        onNext={handleNext}
        onBack={handleBack}
        isReview={isReview}
        isFirst={step === 0}
        isLast={step === activeScreens.length - 1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 56,
    paddingBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
```

- [ ] **Typecheck**

```bash
cd app && npm run typecheck
```
Attendu : erreurs sur les imports manquants (composants pas encore créés) — normal à cette étape.

- [ ] **Commit (partiel — on commit le shell)**

```bash
git add app/app/onboarding.tsx
git commit -m "feat(onboarding): wizard shell — SCREENS array, WizardState, dots nav"
```

---

## Task 4: `PhilosophyScreen`

**Files:**
- Create: `app/components/onboarding/PhilosophyScreen.tsx`

- [ ] **Créer le composant**

```tsx
// app/components/onboarding/PhilosophyScreen.tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { ScreenProps } from '@/app/onboarding';

export function PhilosophyScreen({ onNext }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Bienvenue</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Une app d'entraînement pensée différemment.
        </Text>

        <Text style={[styles.manifeste, { color: colors.text }]}>
          Ta progression est visible, motivante, et personnelle.{'\n'}
          Elle ne te compare à personne.{'\n'}
          Elle ne te punit jamais.
        </Text>

        <View style={[styles.block, { borderColor: colors.border }]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Ce que tu ne trouveras pas</Text>
          <Text style={[styles.blockBody, { color: colors.textSecondary }]}>
            {'— Pas de streak à maintenir\n'}
            {'— Pas de "tu n\'as pas fait de séance depuis X jours"\n'}
            {'— Pas de classements ou comparaisons\n'}
            {'— Pas d\'objectifs quotidiens culpabilisants'}
          </Text>
        </View>

        <View style={[styles.block, { borderColor: colors.border }]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Ce que tu vas trouver</Text>
          <Text style={[styles.blockBody, { color: colors.textSecondary }]}>
            {'— Suivi précis série par série\n'}
            {'— Progression automatique des charges\n'}
            {'— Tes meilleures marques et ton historique\n'}
            {'— Une séance guidée du début à la fin'}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableA11y
          onPress={onNext}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityLabel="Continuer"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>Continuer</Text>
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 40, gap: 24 },
  title: { fontSize: 32, fontFamily: 'Inter_900Black' },
  subtitle: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  manifeste: { fontSize: 18, fontFamily: 'Inter_600SemiBold', lineHeight: 28 },
  block: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  blockTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  blockBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  footer: { padding: 24, borderTopWidth: 1 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
```

- [ ] **Typecheck**

```bash
cd app && npm run typecheck
```

- [ ] **Commit**

```bash
git add app/components/onboarding/PhilosophyScreen.tsx
git commit -m "feat(onboarding): PhilosophyScreen — manifeste valeurs"
```

---

## Task 5: `ObjectiveScreen`

**Files:**
- Create: `app/components/onboarding/ObjectiveScreen.tsx`

- [ ] **Créer le composant**

```tsx
// app/components/onboarding/ObjectiveScreen.tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import type { ScreenProps, Objective } from '@/app/onboarding';

const OBJECTIVES: { value: Objective; label: string; description: string }[] = [
  { value: 'force',        label: 'Force',              description: 'Soulever plus lourd. Progresser sur les grands mouvements.' },
  { value: 'hypertrophie', label: 'Hypertrophie',       description: 'Développer le volume musculaire. Plus de séries, plus de reps.' },
  { value: 'maintien',     label: 'Maintien',           description: 'Garder ce que tu as construit. Entraînement régulier et équilibré.' },
  { value: 'cardio',       label: 'Cardio / Endurance', description: 'Améliorer ton souffle et ta condition physique.' },
];

export function ObjectiveScreen({ wizardState, setWizardState, onNext, onBack }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const selected = wizardState.objective;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <PressableA11y onPress={onBack} accessibilityLabel="Retour" accessibilityRole="button">
          <Text style={{ color: colors.textSecondary }}>← Retour</Text>
        </PressableA11y>
        <Text style={[styles.title, { color: colors.text }]}>Quel est ton objectif principal ?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Pour te suggérer un programme adapté. Modifiable à tout moment.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {OBJECTIVES.map(obj => {
          const isSelected = selected === obj.value;
          return (
            <PressableA11y
              key={obj.value}
              onPress={() => setWizardState({ objective: obj.value })}
              style={[
                styles.card,
                { borderColor: colors.border, backgroundColor: colors.surface },
                isSelected && { borderColor: colors.primary },
              ]}
              accessibilityLabel={`${obj.label} — ${obj.description}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.cardLabel, { color: colors.text }]}>{obj.label}</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{obj.description}</Text>
            </PressableA11y>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableA11y
          onPress={onNext}
          disabled={!selected}
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            !selected && { opacity: 0.4 },
          ]}
          accessibilityLabel="Continuer"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>Continuer</Text>
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, gap: 8 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 24, gap: 12, paddingBottom: 24 },
  card: { borderWidth: 1.5, borderRadius: 12, padding: 16, gap: 4 },
  cardLabel: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  cardDesc: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  footer: { padding: 24, borderTopWidth: 1 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
```

- [ ] **Typecheck**

```bash
cd app && npm run typecheck
```

- [ ] **Commit**

```bash
git add app/components/onboarding/ObjectiveScreen.tsx
git commit -m "feat(onboarding): ObjectiveScreen — 4 chips objectif"
```

---

## Task 6: `ProgramScreen`

**Files:**
- Create: `app/components/onboarding/ProgramScreen.tsx`

- [ ] **Créer le composant**

```tsx
// app/components/onboarding/ProgramScreen.tsx
import { View, Text, FlatList, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useState } from 'react';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePrograms } from '@/hooks/usePrograms';
import { TEMPLATES } from '@/data/templates';
import { importTemplate, isTemplateImported } from '@/services/TemplateService';
import { getDb } from '@/db';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import type { ScreenProps } from '@/app/onboarding';
import type { TemplateDefinition } from '@/data/templates';

const OBJECTIVE_LEVELS: Record<string, TemplateDefinition['level'][]> = {
  force:        ['débutant', 'intermédiaire'],
  hypertrophie: ['intermédiaire', 'avancé'],
  maintien:     ['débutant', 'intermédiaire'],
  cardio:       ['débutant', 'intermédiaire'],
};

export function ProgramScreen({ wizardState, setWizardState, onNext, onBack, isReview }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { programs, refresh } = usePrograms();
  const [selected, setSelected] = useState<TemplateDefinition | null>(null);
  const [programName, setProgramName] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relevantLevels = wizardState.objective ? OBJECTIVE_LEVELS[wizardState.objective] : null;
  const filtered = relevantLevels
    ? TEMPLATES.filter(t => relevantLevels.includes(t.level))
    : TEMPLATES;

  const activeProgram = programs.find(p => p.is_active === 1);

  const handleImport = async () => {
    if (!selected || !programName.trim()) return;
    setImporting(true);
    setError(null);
    try {
      const db = getDb();
      const id = await importTemplate(
        selected,
        programName.trim(),
        new SQLiteProgramRepository(db),
        new SQLiteWorkoutRepository(db),
        new SQLiteWorkoutExerciseRepository(db),
        new SQLiteBlockRepository(db),
        new SQLiteSetRepository(db),
        new SQLiteExerciseRepository(db),
      );
      await refresh();
      setWizardState({ selectedProgramId: id });
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <PressableA11y onPress={onBack} accessibilityLabel="Retour" accessibilityRole="button">
          <Text style={{ color: colors.textSecondary }}>← Retour</Text>
        </PressableA11y>
        <Text style={[styles.title, { color: colors.text }]}>Choisis un programme</Text>
        {isReview && activeProgram && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Programme actuel : {activeProgram.name}
          </Text>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const alreadyImported = isTemplateImported(programs, item.id);
          const isSelected = selected?.id === item.id;
          return (
            <PressableA11y
              onPress={() => { setSelected(item); setProgramName(item.name); }}
              style={[
                styles.card,
                { borderColor: colors.border, backgroundColor: colors.surface },
                isSelected && { borderColor: colors.primary },
              ]}
              accessibilityLabel={item.name}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.cardRow}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
                {alreadyImported && (
                  <Text style={[styles.badge, { color: colors.textSecondary }]}>Déjà importé</Text>
                )}
              </View>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                {item.frequency} · {item.level}
              </Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.description}</Text>
            </PressableA11y>
          );
        }}
      />

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {selected ? (
          <>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              value={programName}
              onChangeText={setProgramName}
              placeholder="Nom du programme"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Nom du programme"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <PressableA11y
              onPress={handleImport}
              disabled={!programName.trim() || importing}
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                (!programName.trim() || importing) && { opacity: 0.4 },
              ]}
              accessibilityLabel="Importer et continuer"
              accessibilityRole="button"
            >
              {importing
                ? <ActivityIndicator color={colors.background} />
                : <Text style={[styles.buttonText, { color: colors.background }]}>Importer et continuer</Text>
              }
            </PressableA11y>
          </>
        ) : (
          <PressableA11y
            onPress={onNext}
            style={[styles.buttonSecondary]}
            accessibilityLabel="Passer cette étape"
            accessibilityRole="button"
          >
            <Text style={{ color: colors.textSecondary }}>Passer cette étape →</Text>
          </PressableA11y>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, gap: 8 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 24, gap: 12, paddingBottom: 24 },
  card: { borderWidth: 1.5, borderRadius: 12, padding: 16, gap: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  badge: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  cardMeta: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  cardDesc: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  footer: { padding: 16, borderTopWidth: 1, gap: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  buttonSecondary: { padding: 16, alignItems: 'center' },
  errorText: { color: '#ef4444', fontSize: 13, fontFamily: 'Inter_400Regular' },
});
```

- [ ] **Typecheck**

```bash
cd app && npm run typecheck
```

- [ ] **Commit**

```bash
git add app/components/onboarding/ProgramScreen.tsx
git commit -m "feat(onboarding): ProgramScreen — templates filtrés par objectif, import inline"
```

---

## Task 7: `SessionDemoScreen`

**Files:**
- Create: `app/components/onboarding/SessionDemoScreen.tsx`

> ⚠️ Ce composant est une **replica autonome** de RunningPhase/RestPhase. Ne pas importer ces composants. À vérifier lors de chaque changement significatif de l'UI de séance.

- [ ] **Créer le composant**

```tsx
// app/components/onboarding/SessionDemoScreen.tsx
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { ScreenProps } from '@/app/onboarding';

// ⚠️ Replica simplifiée de RunningPhase/RestPhase — découplée intentionnellement.
// Vérifier et mettre à jour lors de chaque changement significatif de l'UI de séance.

type DemoStep = 'input' | 'rest' | 'done';
const REST_DURATION_S = 5;
const DEMO_TOTAL_SETS = 3;

export function SessionDemoScreen({ onNext, onBack }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [setIndex, setSetIndex] = useState(0);
  const [demoStep, setDemoStep] = useState<DemoStep>('input');
  const [reps, setReps] = useState('');
  const [restSecs, setRestSecs] = useState(REST_DURATION_S);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (demoStep !== 'rest') return;
    setRestSecs(REST_DURATION_S);
    timerRef.current = setInterval(() => {
      setRestSecs(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          const next = setIndex + 1;
          if (next >= DEMO_TOTAL_SETS) {
            setDemoStep('done');
          } else {
            setSetIndex(next);
            setDemoStep('input');
            setReps('');
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [demoStep, setIndex]);

  const handleValidate = () => {
    if (!reps) return;
    if (setIndex >= DEMO_TOTAL_SETS - 1) {
      setDemoStep('done');
    } else {
      setDemoStep('rest');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topRow}>
        <PressableA11y onPress={onBack} accessibilityLabel="Retour" accessibilityRole="button">
          <Text style={{ color: colors.textSecondary }}>← Retour</Text>
        </PressableA11y>
        <Text style={[styles.label, { color: colors.textSecondary }]}>COMMENT ÇA MARCHE</Text>
      </View>

      {demoStep === 'input' && (
        <View style={styles.content}>
          <Text style={[styles.exerciseName, { color: colors.text }]}>Développé couché</Text>
          <Text style={[styles.setInfo, { color: colors.textSecondary }]}>
            Série {setIndex + 1}/{DEMO_TOTAL_SETS} · 3×8 reps
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Entre le nombre de répétitions effectuées :
          </Text>
          <TextInput
            style={[styles.repsInput, { borderColor: colors.primary, color: colors.text, backgroundColor: colors.surface }]}
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            placeholder="8"
            placeholderTextColor={colors.textDisabled}
            accessibilityLabel="Nombre de répétitions"
          />
          <PressableA11y
            onPress={handleValidate}
            disabled={!reps}
            style={[styles.button, { backgroundColor: colors.primary }, !reps && { opacity: 0.4 }]}
            accessibilityLabel="Valider la série"
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>Valider ✓</Text>
          </PressableA11y>
        </View>
      )}

      {demoStep === 'rest' && (
        <View style={styles.content}>
          <Text style={[styles.restTitle, { color: colors.text }]}>REPOS</Text>
          <Text style={[styles.restTimer, { color: colors.primary }]}>{restSecs}s</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Le timer démarre automatiquement. En séance réelle, la durée est celle configurée dans ton programme.
          </Text>
        </View>
      )}

      {demoStep === 'done' && (
        <View style={styles.content}>
          <Text style={[styles.doneTitle, { color: colors.text }]}>✦ Séance terminée</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Après chaque séance : ton volume total, ton ressenti, tes notes.{'\n'}
            Les charges progressent automatiquement à la prochaine séance.
          </Text>
          <PressableA11y
            onPress={onNext}
            style={[styles.button, { backgroundColor: colors.primary }]}
            accessibilityLabel="Continuer"
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>Continuer</Text>
          </PressableA11y>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  topRow: { gap: 16, marginBottom: 32 },
  label: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  content: { gap: 16 },
  exerciseName: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  setInfo: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  hint: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  repsInput: {
    borderWidth: 2, borderRadius: 12, padding: 16,
    fontSize: 28, fontFamily: 'Inter_700Bold', textAlign: 'center',
  },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  restTitle: { fontSize: 32, fontFamily: 'Inter_900Black' },
  restTimer: { fontSize: 64, fontFamily: 'Inter_900Black' },
  doneTitle: { fontSize: 24, fontFamily: 'Inter_700Bold' },
});
```

- [ ] **Typecheck**

```bash
cd app && npm run typecheck
```

- [ ] **Commit**

```bash
git add app/components/onboarding/SessionDemoScreen.tsx
git commit -m "feat(onboarding): SessionDemoScreen — démo séance interactive (replica autonome)"
```

---

## Task 8: `SettingsIntroScreen`

**Files:**
- Create: `app/components/onboarding/SettingsIntroScreen.tsx`

- [ ] **Créer le composant**

```tsx
// app/components/onboarding/SettingsIntroScreen.tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useContext, useState, useCallback } from 'react';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useUnits } from '@/hooks/useUnits';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';
import { getDb } from '@/db';
import type { PlateStepValue } from '@/services/settingsUtils';
import type { ScreenProps } from '@/app/onboarding';

// Reproduit le SegmentedControl local de reglages.tsx
function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  colors,
  isDark,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
  colors: typeof Colors.light;
  isDark: boolean;
}) {
  return (
    <View style={[sc.container, { borderColor: colors.border, backgroundColor: colors.background }]}>
      {options.map((opt, i) => (
        <PressableA11y
          key={opt.value}
          accessibilityLabel={opt.label}
          accessibilityState={{ selected: selected === opt.value }}
          onPress={() => onSelect(opt.value)}
          style={[
            sc.segment,
            i < options.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border },
            selected === opt.value && { backgroundColor: colors.primary },
          ]}
        >
          <Text style={[
            sc.segmentText,
            { color: selected === opt.value ? (isDark ? '#000' : '#fff') : colors.text },
          ]}>
            {opt.label}
          </Text>
        </PressableA11y>
      ))}
    </View>
  );
}

const sc = StyleSheet.create({
  container: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  segmentText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});

const UNITS_OPTIONS = [
  { value: 'system' as const, label: 'Système' },
  { value: 'kg' as const,     label: 'kg' },
  { value: 'lbs' as const,    label: 'lbs' },
];

const PLATE_STEP_OPTIONS_KG: { value: PlateStepValue; label: string }[] = [
  { value: '1',   label: '1 kg' },
  { value: '2',   label: '2 kg' },
  { value: '2.5', label: '2,5 kg' },
  { value: '5',   label: '5 kg' },
];

const PLATE_STEP_OPTIONS_LBS: { value: PlateStepValue; label: string }[] = [
  { value: '1.25', label: '2,5 lbs' },
  { value: '2.5',  label: '5 lbs' },
  { value: '5',    label: '10 lbs' },
];

export function SettingsIntroScreen({ onNext, onBack }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { preference: unitsPref, resolved: resolvedUnits, setUnit } = useUnits();
  const [plateStep, setPlateStepState] = useState<PlateStepValue>('2.5');

  const plateOptions = resolvedUnits === 'lbs' ? PLATE_STEP_OPTIONS_LBS : PLATE_STEP_OPTIONS_KG;

  const handlePlateStep = useCallback(async (v: PlateStepValue) => {
    setPlateStepState(v);
    const repo = new SQLiteSettingsRepository(getDb());
    await repo.set('plate_step', v);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PressableA11y onPress={onBack} accessibilityLabel="Retour" accessibilityRole="button">
          <Text style={{ color: colors.textSecondary }}>← Retour</Text>
        </PressableA11y>

        <Text style={[styles.title, { color: colors.text }]}>Quelques réglages</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Configure l'essentiel maintenant. Tout est modifiable dans l'onglet Réglages.
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Unités</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Tous les poids s'adaptent automatiquement.
          </Text>
          <SegmentedControl
            options={UNITS_OPTIONS}
            selected={unitsPref}
            onSelect={setUnit}
            colors={colors}
            isDark={isDark}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pas de progression</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Incrément de poids appliqué automatiquement à chaque progression réussie.
          </Text>
          <SegmentedControl
            options={plateOptions}
            selected={plateStep}
            onSelect={handlePlateStep}
            colors={colors}
            isDark={isDark}
          />
        </View>

        <View style={[styles.infoBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Les notifications de rappel sont configurables dans l'onglet Réglages après le lancement.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableA11y
          onPress={onNext}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityLabel="Continuer"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>Continuer</Text>
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 24 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  section: { gap: 8 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  sectionHint: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  infoBlock: { borderWidth: 1, borderRadius: 10, padding: 12 },
  infoText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  footer: { padding: 24, borderTopWidth: 1 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
```

- [ ] **Typecheck**

```bash
cd app && npm run typecheck
```

- [ ] **Commit**

```bash
git add app/components/onboarding/SettingsIntroScreen.tsx
git commit -m "feat(onboarding): SettingsIntroScreen — unités + pas de plaque configurables inline"
```

---

## Task 9: `ProgressionScreen`

**Files:**
- Create: `app/components/onboarding/ProgressionScreen.tsx`

- [ ] **Créer le composant**

```tsx
// app/components/onboarding/ProgressionScreen.tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { ScreenProps } from '@/app/onboarding';

const SECTIONS = [
  {
    label: 'PRÉSENCES',
    description: 'Combien de séances tu as faites ce mois. Additif — jamais soustractif.',
  },
  {
    label: 'MEILLEURES MARQUES',
    description: 'Ton meilleur poids par exercice. Mis à jour automatiquement à chaque séance.',
  },
  {
    label: 'OBJECTIFS',
    description: '"Squat 100 kg d\'ici 3 mois." ETA calculé selon ta progression réelle.',
  },
  {
    label: 'VOLUME PAR GROUPE',
    description: 'Push / Pull / Jambes sur 4 semaines glissantes. Pour équilibrer ton entraînement.',
  },
  {
    label: 'CORPS',
    description: 'Poids de corps et tour de taille. Tendance sur 3 mois.',
  },
];

export function ProgressionScreen({ onNext, onBack }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PressableA11y onPress={onBack} accessibilityLabel="Retour" accessibilityRole="button">
          <Text style={{ color: colors.textSecondary }}>← Retour</Text>
        </PressableA11y>

        <Text style={[styles.title, { color: colors.text }]}>Ta progression</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          L'onglet Progression se construit séance après séance. Voici ce que tu y trouveras.
        </Text>

        {SECTIONS.map(s => (
          <View key={s.label} style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            <Text style={[styles.rowDesc, { color: colors.text }]}>{s.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableA11y
          onPress={onNext}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityLabel="Continuer"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>Continuer</Text>
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 20 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  row: { borderBottomWidth: 1, paddingBottom: 16, gap: 4 },
  rowLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  rowDesc: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  footer: { padding: 24, borderTopWidth: 1 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
```

- [ ] **Typecheck**

```bash
cd app && npm run typecheck
```

- [ ] **Commit**

```bash
git add app/components/onboarding/ProgressionScreen.tsx
git commit -m "feat(onboarding): ProgressionScreen — aperçu onglet progression"
```

---

## Task 10: `ReadyScreen`

**Files:**
- Create: `app/components/onboarding/ReadyScreen.tsx`

- [ ] **Créer le composant**

Note: la persistance `onboarding_done` et la navigation sont gérées dans `onboarding.tsx` via `handleNext`. `ReadyScreen` appelle juste `onNext()`.

```tsx
// app/components/onboarding/ReadyScreen.tsx
import { View, Text, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { ScreenProps } from '@/app/onboarding';

export function ReadyScreen({ wizardState, onNext, isReview }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isReview ? 'Rappel terminé' : 'C\'est parti'}
        </Text>

        {!isReview && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Tout est prêt. Lance ta première séance depuis l'accueil.
          </Text>
        )}

        <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {wizardState.objective && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryKey, { color: colors.textSecondary }]}>Objectif</Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>
                {wizardState.objective.charAt(0).toUpperCase() + wizardState.objective.slice(1)}
              </Text>
            </View>
          )}
          {wizardState.selectedProgramId && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryKey, { color: colors.textSecondary }]}>Programme</Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>Importé ✓</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableA11y
          onPress={onNext}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityLabel={isReview ? 'Retour aux réglages' : 'Commencer'}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {isReview ? 'Retour aux réglages' : 'Commencer →'}
          </Text>
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', gap: 24 },
  title: { fontSize: 32, fontFamily: 'Inter_900Black' },
  subtitle: { fontSize: 16, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  summary: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryKey: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  summaryVal: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  footer: { padding: 24, borderTopWidth: 1 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
```

- [ ] **Typecheck + tests complets**

```bash
cd app && npm run typecheck && npx jest --no-coverage
```
Attendu : 0 TS errors, tous tests passent.

- [ ] **Commit**

```bash
git add app/components/onboarding/ReadyScreen.tsx
git commit -m "feat(onboarding): ReadyScreen — résumé wizard + CTA"
```

---

## Task 11: Réglages — "Revoir l'onboarding" + aide contextuelle (?)

**Files:**
- Modify: `app/app/(tabs)/reglages.tsx`

- [ ] **Ajouter state pour aide expandable**

En haut du composant `ReglagesScreen`, après les states existants :

```ts
const [expandedHelp, setExpandedHelp] = useState<string | null>(null);
const toggleHelp = (id: string) =>
  setExpandedHelp(prev => (prev === id ? null : id));
```

- [ ] **Créer helper `SectionHeader`**

Ajouter cette fonction locale dans `reglages.tsx`, avant `ReglagesScreen` :

```tsx
function SectionHeader({
  title,
  helpId,
  helpText,
  expandedHelp,
  onToggleHelp,
  colors,
}: {
  title: string;
  helpId: string;
  helpText: string;
  expandedHelp: string | null;
  onToggleHelp: (id: string) => void;
  colors: typeof Colors.light;
}) {
  const isOpen = expandedHelp === helpId;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[reglageStyles.sectionLabel, { color: colors.textSecondary }]}>{title}</Text>
        <PressableA11y
          onPress={() => onToggleHelp(helpId)}
          accessibilityLabel={`Aide — ${title}`}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>(?)</Text>
        </PressableA11y>
      </View>
      {isOpen && (
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {helpText}
        </Text>
      )}
    </View>
  );
}
```

Note : `reglageStyles` est l'objet `StyleSheet` de `reglages.tsx`. Vérifie que la clé `sectionLabel` existe (ou utilise `{ fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 }` inline si la clé diffère).

- [ ] **Remplacer les `<Text style={sectionLabel}>` existants par `<SectionHeader>`**

Exemple pour la section THÈME :

```tsx
// Avant :
<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>THÈME</Text>

// Après :
<SectionHeader
  title="THÈME"
  helpId="theme"
  helpText="L'app s'adapte automatiquement à ton système, ou tu choisis manuellement Clair ou Sombre."
  expandedHelp={expandedHelp}
  onToggleHelp={toggleHelp}
  colors={colors}
/>
```

Répéter pour chaque section :
- `UNITÉS` → "Choisis entre kilogrammes et livres. Tous les poids s'adaptent."
- `PROGRESSION` → "Le pas de plaque détermine l'incrément de poids automatique à chaque progression réussie."
- `DÉCHARGE` → "Après X semaines consécutives, une semaine allégée est suggérée automatiquement."
- `NOTIFICATIONS` → "Un rappel hebdomadaire optionnel. Jamais d'alerte pour une séance manquée."
- `DONNÉES` → "Exporte l'ensemble de tes données en JSON pour sauvegarde personnelle."

- [ ] **Ajouter bouton "Revoir l'onboarding"**

En bas du ScrollView de `reglages.tsx`, avant la fermeture `</ScrollView>` :

```tsx
import { useRouter } from 'expo-router';
// (ajouter à l'import existant expo-router si pas déjà présent)

// Dans ReglagesScreen, ajouter :
const router = useRouter();

// Dans le JSX, section en bas :
<View style={styles.section}>
  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>À PROPOS</Text>
  <PressableA11y
    onPress={() => router.push('/onboarding?review=true')}
    style={[styles.row, { backgroundColor: colors.surface }]}
    accessibilityLabel="Revoir l'onboarding"
    accessibilityRole="button"
  >
    <Text style={[styles.rowLabel, { color: colors.text }]}>Revoir l'introduction</Text>
    <Text style={{ color: colors.textSecondary }}>›</Text>
  </PressableA11y>
</View>
```

Note : adapte les styles `section`, `row`, `rowLabel` selon ce qui existe dans `reglages.tsx`. Ouvre le fichier et vérifie les clés disponibles avant d'écrire.

- [ ] **Typecheck + tests complets**

```bash
cd app && npm run typecheck && npx jest --no-coverage
```
Attendu : 0 TS errors, tous tests passent.

- [ ] **Commit**

```bash
git add app/app/(tabs)/reglages.tsx
git commit -m "feat(onboarding): Réglages — aide contextuelle (?) + bouton revoir l'introduction"
```

---

## Self-Review — Couverture spec

| Exigence spec | Task couvrant |
|---|---|
| `shouldSkip` TDD | T1 |
| `_layout.tsx` check `onboarding_done` | T2 |
| Redirect `router.replace('/onboarding')` dans RootLayoutNav | T2 |
| Route `onboarding.tsx` + SCREENS array | T3 |
| Dots progress (hors Philosophy) | T3 |
| `?review=true` désactive skip conditions | T3 + T1 |
| Mode review → `router.back()` | T3 |
| PhilosophyScreen | T4 |
| ObjectiveScreen — 4 chips, wizardState.objective | T5 |
| ProgramScreen — filtré par objectif, import inline, mode review | T6 |
| SessionDemoScreen — replica autonome, ⚠️ commentaire maintenance | T7 |
| SettingsIntroScreen — unités + plate step persistés | T8 |
| ProgressionScreen — aperçu statique | T9 |
| ReadyScreen — résumé + CTA | T10 |
| "Revoir l'onboarding" dans Réglages | T11 |
| Aide (?) expandable par section | T11 |
