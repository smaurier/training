# Philosophie UX — Audit anti-perf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger 3 violations du manifeste anti-perf détectées lors de l'audit, et mettre à jour le PhilosophyScreen avec la copy de l'écran 0 validé.

**Architecture:** Correctifs chirurgicaux — 1 service, 1 écran, 1 composant. Aucun nouveau fichier créé. La `PhilosophyScreen` existante remplace l'écran 0 du spec (même contenu, format différent) : sa copy est mise à jour plutôt que d'ajouter un 8e écran au wizard.

**Tech Stack:** React Native, Expo, TypeScript, Jest

---

## Tokens design system (mémoriser)

```ts
colors.primary      // lime #84CC16
colors.onPrimary    // #0D0D0D — texte ON fond lime
colors.text         // #FFFFFF dark / #0D0D0D light
colors.textSecondary // #888888 dark / #8A8A8A light
colors.border       // #2A2A2A dark / #E2E2E2 light
```

Typographie : `Inter_900Black` titres héros, `Inter_700Bold` CTA uppercase, `Inter_600SemiBold` labels uppercase, `Inter_400Regular` corps.

---

## Fichiers modifiés

| Fichier | Rôle |
|---|---|
| `app/services/NotificationService.ts` | Service notifications — ligne 65, message inactivité |
| `app/services/NotificationService.test.ts` | Tests — vérifier body inactivité |
| `app/app/progression/[exerciseId].tsx` | Écran progression exercice — copy "stagnante" |
| `app/components/onboarding/PhilosophyScreen.tsx` | Composant écran 0 — copy manifeste |

---

## Task 1: Notification inactivité — copy anti-perf

**Violation :** `NotificationService.ts:65`
```ts
// ❌ Actuel — punit l'absence explicitement
const body = `Tu n'as pas fait de séance depuis ${settings.inactivityDays} jours. C'est le moment de reprendre 💪`;
```

**Fix :** message factuel et invitant, sans mention de l'absence.

**Files:**
- Modify: `app/services/NotificationService.ts` (line 65)
- Modify: `app/services/NotificationService.test.ts`

- [ ] **Step 1: Écrire le test RED**

Dans `app/services/NotificationService.test.ts`, ajouter dans le bloc `scheduleInactivityCheck` :

```ts
it('le body de la notif inactivité ne punit pas l\'absence', async () => {
  settings = defaultSettings;
  const lastSession = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  await service.scheduleInactivityCheck(lastSession);
  const scheduled = await scheduler.getScheduled();
  const inactivity = scheduled.find(n => n.id === 'inactivity-check');
  expect(inactivity).toBeDefined();
  expect(inactivity!.body).not.toMatch(/n'as pas fait/i);
  expect(inactivity!.body).not.toMatch(/depuis.*jours/i);
});
```

Note : `InMemoryNotificationScheduler.scheduleOnce` doit exposer `body` dans l'objet schedulé. Vérifier la structure retournée par `getScheduled()` — si `body` n'est pas exposé, l'ajouter à `InMemoryNotificationScheduler`.

- [ ] **Step 2: Vérifier que le test échoue**

```bash
cd app && npx jest --testPathPattern="NotificationService" --no-coverage
```

Attendu : FAIL — `body` not matching ou assertion échoue sur le body actuel.

- [ ] **Step 3: Implémenter le fix**

Dans `app/services/NotificationService.ts`, ligne 65 :

```ts
// ✅ Factuel, invitant, sans punition
const body = `Prêt pour une séance ? Ton programme t'attend.`;
```

Note : le message est statique (plus besoin de `settings.inactivityDays` dans le body). La logique de `fireDate` reste inchangée.

- [ ] **Step 4: Si `InMemoryNotificationScheduler` n'expose pas `body`**

Lire `app/services/InMemoryNotificationScheduler.ts`. Si la structure `getScheduled()` ne retourne pas `body`, ajouter le champ :

```ts
// Structure existante du schedulé — ajouter body si absent
type ScheduledOnce = {
  id: string;
  triggerType: 'once';
  fireDate: Date;
  body: string;  // ← ajouter si manquant
};
```

Et dans `scheduleOnce(id, date, body)`, stocker `body` dans la Map.

- [ ] **Step 5: Vérifier que le test passe**

```bash
cd app && npx jest --testPathPattern="NotificationService" --no-coverage
```

Attendu : toutes les assertions de `NotificationService.test.ts` passent.

- [ ] **Step 6: Typecheck + commit**

```bash
cd app && npm run typecheck
git add app/services/NotificationService.ts app/services/NotificationService.test.ts app/services/InMemoryNotificationScheduler.ts
git commit -m "fix(notif): message inactivité factuel, sans punition de l'absence"
```

---

## Task 2: Copy "Progression stagnante" — retirer le jugement de valeur

**Violation :** `app/app/progression/[exerciseId].tsx` lignes 363 et 435.

```tsx
// ❌ Actuel — "stagnante" est un jugement négatif sur la progression
{eta.status === 'stagnant' && ' · Progression stagnante — ETA non calculable'}
```

**Fix :** description factuelle sans jugement.

**Files:**
- Modify: `app/app/progression/[exerciseId].tsx` (lines ~363 and ~435)

Note : aucun test à écrire — copie statique dans JSX.

- [ ] **Step 1: Lire le fichier pour localiser les deux occurrences**

Chercher dans le fichier :
```
grep -n "stagnante" app/app/progression/[exerciseId].tsx
```

Deux occurrences attendues (~lignes 363 et 435).

- [ ] **Step 2: Remplacer les deux occurrences**

```tsx
// ✅ Factuel, sans jugement
{eta.status === 'stagnant' && ' · ETA non calculable'}
```

Les deux occurrences sont identiques — remplacer les deux.

- [ ] **Step 3: Typecheck + commit**

```bash
cd app && npm run typecheck
git add "app/app/progression/[exerciseId].tsx"
git commit -m "fix(copy): supprimer 'Progression stagnante' — ETA non calculable suffit"
```

---

## Task 3: PhilosophyScreen — copy écran 0 du spec

**Contexte :** La `PhilosophyScreen` est l'écran 0 du wizard (premier écran, step=0, dots masqués). Sa copy actuelle diverge du texte validé dans `docs/superpowers/specs/2026-06-12-philosophie-entrainement-sain.md` section 5. L'objectif est d'aligner la copy avec le manifeste tout en gardant la structure blocks qui aide les nouveaux utilisateurs.

**Texte validé dans le spec (section 5) :**
```
Bienvenue.

Cette app est un carnet d'entraînement.
Elle suit ta progression. Elle te guide en séance.
Elle n'est pas là pour te juger.

Pas de classements. Pas de comparaisons.
Pas de message si tu rates une séance.

Ta courbe de progression t'appartient.
Elle est là quand tu la cherches.
```

**Files:**
- Modify: `app/components/onboarding/PhilosophyScreen.tsx`

Note : aucun test à écrire — composant visuel pur.

- [ ] **Step 1: Mettre à jour le composant**

Remplacer le contenu de `PhilosophyScreen.tsx` par :

```tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import type { ScreenProps } from '@/app/onboarding';

export function PhilosophyScreen({ onNext }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Bienvenue.</Text>

        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          {'Cette app est un carnet d\'entraînement.\n'}
          {'Elle suit ta progression. Elle te guide en séance.\n'}
          {'Elle n\'est pas là pour te juger.'}
        </Text>

        <View style={[styles.block, { borderColor: colors.border }]}>
          <Text style={[styles.blockBody, { color: colors.textSecondary }]}>
            {'Pas de classements. Pas de comparaisons.\n'}
            {'Pas de message si tu rates une séance.'}
          </Text>
        </View>

        <View style={[styles.block, { borderColor: colors.border }]}>
          <Text style={[styles.blockBody, { color: colors.textSecondary }]}>
            {'Ta courbe de progression t\'appartient.\n'}
            {'Elle est là quand tu la cherches.'}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableA11y
          onPress={onNext}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityLabel="Continuer vers la configuration"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Continuer →</Text>
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 48, gap: 28 },
  title: { fontSize: 40, fontFamily: 'Inter_900Black', letterSpacing: -1 },
  intro: { fontSize: 17, fontFamily: 'Inter_400Regular', lineHeight: 26 },
  block: { borderWidth: 1, borderRadius: Radius.sm, padding: 16 },
  blockBody: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 24 },
  footer: { padding: 24, borderTopWidth: 1 },
  button: { borderRadius: Radius.sm, padding: 18, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
});
```

**Changements clés vs version précédente :**
- Titre `fontSize:32` → `fontSize:40 letterSpacing:-1` (plus impactant, Inter_900Black)
- Manifeste court remplace le long texte actuel
- Deux blocs restent mais avec la copy exacte du spec
- Accessibilité `accessibilityLabel` mis à jour
- CTA `"Continuer →"` (flèche légère)
- `borderRadius: Radius.sm` au lieu de `12` hardcodé

- [ ] **Step 2: Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 3: Commit**

```bash
git add app/components/onboarding/PhilosophyScreen.tsx
git commit -m "feat(onboarding): PhilosophyScreen — copy manifeste validé, titre 40px Black"
```

---

## Self-review

**1. Couverture spec :**
- ✅ Anti-pattern notification `"Tu n'as pas fait de séance depuis X jours"` → T1
- ✅ Copy `"Progression stagnante"` → T2
- ✅ Écran 0 onboarding (PhilosophyScreen mise à jour) → T3
- ✅ Audit 6 axes complet — aucun autre anti-pattern trouvé dans le code

**2. Scan placeholders :** Aucun.

**3. Cohérence types :** `InMemoryNotificationScheduler.getScheduled()` retourne la structure avec `body` (T1 step 4 conditionnel).
