# Justification des choix architecturaux — Trace

> Document pédagogique. Chaque section explique UN choix : ce qu'on a fait, pourquoi, ce qui se passe sans, et ce que ça t'apprend en tant que développeur.

---

## Table des matières

1. [React Native + Expo](#1-react-native--expo)
2. [Expo Router — navigation file-based](#2-expo-router--navigation-file-based)
3. [SQLite local-first — pas de backend](#3-sqlite-local-first--pas-de-backend)
4. [Schéma relationnel — pourquoi des tables liées](#4-schéma-relationnel--pourquoi-des-tables-liées)
5. [Migrations versionnées — PRAGMA user_version](#5-migrations-versionnées--pragma-user_version)
6. [ON DELETE CASCADE — intégrité référentielle](#6-on-delete-cascade--intégrité-référentielle)
7. [Repository Pattern — interfaces + implémentations](#7-repository-pattern--interfaces--implémentations)
8. [Dependency Injection — le constructeur de SessionService](#8-dependency-injection--le-constructeur-de-sessionservice)
9. [Service Layer — la logique métier séparée de React](#9-service-layer--la-logique-métier-séparée-de-react)
10. [Machine à états — useSession](#10-machine-à-états--usesession)
11. [Hooks custom — le pont entre React et les services](#11-hooks-custom--le-pont-entre-react-et-les-services)
12. [useTimer — timestamp absolu vs interval naïf](#12-usetimer--timestamp-absolu-vs-interval-naïf)
13. [TypeScript strict — le compilateur comme filet de sécurité](#13-typescript-strict--le-compilateur-comme-filet-de-sécurité)
14. [Design tokens — Colors.ts, Radius.ts](#14-design-tokens--colorsts-radiusts)
15. [PressableA11y — accessibilité par construction](#15-pressablea11y--accessibilité-par-construction)
16. [Flux de données unidirectionnel](#16-flux-de-données-unidirectionnel)
17. [Singleton DB — getDb()](#17-singleton-db--getdb)
18. [Seeds — données initiales](#18-seeds--données-initiales)
19. [Gestion des erreurs aux frontières](#19-gestion-des-erreurs-aux-frontières)
20. [Conventions de nommage et structure de fichiers](#20-conventions-de-nommage-et-structure-de-fichiers)
21. [Pas de commentaires (ou presque)](#21-pas-de-commentaires-ou-presque)
22. [Pre-commit hook TypeScript](#22-pre-commit-hook-typescript)
23. [Catalogue des design patterns utilisés](#23-catalogue-des-design-patterns-utilisés)
24. [Pourquoi pas Zustand ou Redux ?](#24-pourquoi-pas-zustand-ou-redux-)

---

## 1. React Native + Expo

### Ce qu'on a fait
Framework React Native pour le moteur de rendu mobile, Expo comme couche d'outillage et de build.

### Pourquoi React Native plutôt qu'une app web ?
Une Progressive Web App (PWA) tourne dans un navigateur. Elle a accès à très peu d'APIs natives :
- Pas de vibration fiable sur iOS
- Pas de SQLite performant
- Pas de timer en background
- Pas d'accès au stockage local sans limites

Ces trois fonctionnalités sont au cœur de l'app. React Native donne accès aux APIs natives de iOS et Android via un pont JavaScript ↔ natif.

### Pourquoi Expo plutôt que "bare" React Native ?
"Bare" React Native = tu gères toi-même Xcode, Android Studio, les dépendances natives, les certificats de signature. Pour un projet solo, c'est des semaines de configuration sans valeur produit.

Expo gère tout ça. Tu écris du JavaScript, Expo compile pour iOS/Android. La contrepartie : Expo SDK impose sa version de React Native, et certaines libs très spécifiques sont incompatibles.

**Pour un MVP solo, c'est le bon arbitrage.** Le jour où l'app grandit et où tu as besoin de quelque chose qu'Expo ne supporte pas, tu "ejectes" vers bare.

---

## 2. Expo Router — navigation file-based

### Ce qu'on a fait
La structure des fichiers dans `app/` *est* la structure des routes de l'app.

```
app/
├── (tabs)/
│   ├── index.tsx          → onglet Accueil
│   ├── programmes.tsx     → onglet Programmes
│   └── progression.tsx    → onglet Progression
├── programme/[id].tsx     → /programme/42
├── workout/[id].tsx       → /workout/7
└── session/[workoutId].tsx → /session/7
```

### Pourquoi ?
L'alternative est React Navigation : tu définis les routes dans un fichier centralisé, tu les configures manuellement, tu passes les paramètres manuellement.

```typescript
// Avec React Navigation — configuration manuelle
const Stack = createNativeStackNavigator();
<Stack.Navigator>
  <Stack.Screen name="Programme" component={ProgrammeScreen} />
  <Stack.Screen name="Workout" component={WorkoutScreen} />
</Stack.Navigator>
```

Avec Expo Router, le fichier `programme/[id].tsx` crée automatiquement la route. Tu navigues avec :

```typescript
router.push({ pathname: '/programme/[id]', params: { id: '42' } });
```

Et tu lis le paramètre dans l'écran :
```typescript
const { id } = useLocalSearchParams<{ id: string }>();
```

**Avantage principal :** La structure du projet EST la documentation de la navigation. En regardant l'arborescence de `app/`, tu comprends tous les écrans sans lire de code.

### `(tabs)/` — groupe sans impact sur l'URL
Les parenthèses créent un groupe logique. `(tabs)/index.tsx` correspond à la route `/`, pas à `/tabs`. C'est juste pour organiser les fichiers.

### `_layout.tsx` — layout partagé
Chaque `_layout.tsx` enveloppe tous les écrans du même dossier. C'est là que tu configures le Stack, les tabs, ou l'entête de navigation.

---

## 3. SQLite local-first — pas de backend

### Ce qu'on a fait
Toutes les données sont stockées dans SQLite sur l'appareil. Pas de serveur, pas d'API, pas d'authentification.

### Pourquoi SQLite et pas AsyncStorage ?
AsyncStorage est un dictionnaire clé/valeur. C'est bien pour stocker des préférences simples (`theme: 'dark'`). Mais si tu veux stocker des exercices, des séances, des séries, des logs — tu dois tout sérialiser en JSON dans une seule clé, et tout désérialiser pour lire quoi que ce soit. Aucun filtre, aucun tri, aucune jointure.

```typescript
// AsyncStorage — tout ou rien
const data = await AsyncStorage.getItem('workouts'); // string JSON géant
const workouts = JSON.parse(data); // tu charges TOUT en mémoire
const filtered = workouts.filter(w => w.program_id === 3); // filtre en JS
```

SQLite te donne une vraie base de données :
```sql
SELECT * FROM workouts WHERE program_id = 3 ORDER BY order_index;
```

La DB fait le filtre, le tri, la jointure — en C, beaucoup plus vite que du JS.

### Pourquoi pas un backend (Firebase, Supabase, API perso) ?
Pour ce projet solo MVP, un backend aurait ajouté :

| Problème | Coût |
|---|---|
| Authentification | 1-2 semaines |
| Gestion des erreurs réseau (offline, timeout) | 1 semaine |
| Sécurité (règles Firestore, CORS, tokens) | 1 semaine |
| Frais d'hébergement | Argent |
| Latence sur chaque opération | UX dégradée |

Pour un utilisateur unique, ces coûts n'ont aucune valeur. La règle **YAGNI** (You Aren't Gonna Need It) : ne construis pas ce dont tu n'as pas besoin maintenant.

**La contrepartie :** Pas de sync entre appareils. Les données disparaissent si l'app est désinstallée. C'est un problème V2.

---

## 4. Schéma relationnel — pourquoi des tables liées

### Ce qu'on a fait
```
programs → workouts → workout_exercises → blocks → sets
                                                  ↓
session_logs → set_logs → personal_records
```

### Pourquoi cette hiérarchie ?
Chaque table représente une entité avec une responsabilité claire :

| Table | Rôle | Contient |
|---|---|---|
| `exercises` | Bibliothèque globale | Nom, type, muscles, pas de progression |
| `programs` | Programme d'entraînement | Nom, actif/inactif |
| `workouts` | Séance dans un programme | Nom, ordre |
| `workout_exercises` | Exercice dans une séance (template) | Lien workout ↔ exercise |
| `blocks` | Bloc dans un exercice | Nom (Travail, Échauffement), ordre |
| `sets` | Série dans un bloc | Reps cible, poids cible, durée pause |
| `session_logs` | Séance réellement effectuée | Date, check-in, durée |
| `set_logs` | Série réellement effectuée | Reps réelles, poids réel, RPE |
| `personal_records` | Meilleur PR par exercice | 1RM estimé (formule Epley) |

**La distinction critique : template vs réel.**

`sets` stocke la *cible* (ce que tu vises). `set_logs` stocke la *réalité* (ce que tu as fait). C'est cette séparation qui permet d'afficher "tu avais prévu 80 kg × 5, tu as fait 82.5 kg × 6".

Si tu avais tout dans une seule table, modifier la cible effacerait l'historique.

### La formule Epley (1RM estimé)
```typescript
// Dans SessionService.logSet()
const estimated1RM = actual.weightDone * (1 + actual.repsDone / 30);
```

La formule d'Epley estime ton maximum sur une répétition à partir de n'importe quelle série. `82.5 kg × 6 reps` → `82.5 * (1 + 6/30) = 99 kg` de 1RM estimé. C'est une approximation, pas une vérité absolue, mais elle permet de suivre la progression dans le temps.

---

## 5. Migrations versionnées — PRAGMA user_version

### Ce qu'on a fait
```typescript
// db/schema.ts
export const MIGRATIONS: string[] = [
  // v1 — schéma initial
  `CREATE TABLE IF NOT EXISTS exercises (...);
   CREATE TABLE IF NOT EXISTS programs (...);`,
  
  // v2 — ajout ON DELETE CASCADE
  `PRAGMA foreign_keys = OFF;
   ...reconstruction des tables avec CASCADE...
   PRAGMA foreign_keys = ON;`,
];
```

```typescript
// db/migrations.ts
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const { user_version } = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version') ?? { user_version: 0 };
  
  for (let i = user_version; i < MIGRATIONS.length; i++) {
    await db.execAsync(MIGRATIONS[i]);
    await db.execAsync(`PRAGMA user_version = ${i + 1}`);
  }
}
```

### Pourquoi ?
Quand l'app est déjà installée sur l'appareil de l'utilisateur, la DB existe. Si tu modifies le schéma dans le code (ajouter une colonne, une table, une contrainte), la DB de l'utilisateur *ne change pas* — elle a été créée avec l'ancien schéma.

Sans migrations : l'app crashe ou fonctionne mal parce que le code attend une colonne qui n'existe pas.

Avec migrations : au démarrage, le runner compare `user_version` (stocké dans la DB) avec le nombre de migrations dans le code. S'il manque des versions, il les applique dans l'ordre. L'utilisateur ne voit rien.

**Analogie :** C'est exactement ce que font `rails db:migrate`, `django migrate`, ou Flyway. On a juste réimplémenté le principe en 20 lignes de TypeScript sans dépendance externe.

**Règle d'or :** On n'édite jamais une migration existante. On en ajoute une nouvelle. La v1 ne change jamais — elle a peut-être déjà été exécutée sur des milliers d'appareils.

---

## 6. ON DELETE CASCADE — intégrité référentielle

### Ce qu'on a fait
```sql
CREATE TABLE workouts (
  id         INTEGER PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE
);
```

### Pourquoi ?
Sans `ON DELETE CASCADE`, si tu supprimes un programme :
- La table `programs` : ligne supprimée ✓
- La table `workouts` : les séances de ce programme existent encore ✗
- La table `workout_exercises` : les exercices de ces séances existent encore ✗
- etc.

Ces lignes orphelines (qui pointent vers un parent inexistant) corrompent silencieusement ta DB. Tes requêtes retournent des données invalides. Les bugs sont impossibles à tracer.

`ON DELETE CASCADE` dit à SQLite : "si le parent est supprimé, supprime automatiquement tous ses enfants". C'est une opération atomique garantie par la DB elle-même — pas de code applicatif à maintenir.

**Condition d'activation :**
```typescript
// db/index.ts — doit être activé manuellement sur SQLite
_db.execSync('PRAGMA foreign_keys = ON');
```

SQLite désactive les clés étrangères par défaut (héritage historique). Cette ligne les active à chaque ouverture de connexion.

**Règle :** Utilise CASCADE quand l'entité enfant n'a aucun sens sans son parent. Un bloc sans exercice-dans-séance n'a pas de sens → CASCADE. Un exercice sans programme a du sens (la bibliothèque d'exercices est globale) → pas de CASCADE.

---

## 7. Repository Pattern — interfaces + implémentations

C'est probablement le choix le plus important architecturalement.

### Ce qu'on a fait

**Étape 1 : définir un contrat (interface)**
```typescript
// repositories/IExerciseRepository.ts
export interface IExerciseRepository {
  findAll(): Promise<Exercise[]>;
  findById(id: number): Promise<Exercise | null>;
  save(data: CreateExerciseDto): Promise<Exercise>;
  delete(id: number): Promise<void>;
}
```

**Étape 2 : implémentation "réelle" (SQLite)**
```typescript
// repositories/SQLiteExerciseRepository.ts
export class SQLiteExerciseRepository implements IExerciseRepository {
  constructor(private db: SQLiteDatabase) {}

  async findAll(): Promise<Exercise[]> {
    return this.db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY name');
  }
  // ...
}
```

**Étape 3 : implémentation "test" (RAM)**
```typescript
// repositories/InMemoryExerciseRepository.ts
export class InMemoryExerciseRepository implements IExerciseRepository {
  private exercises: Exercise[] = [];
  private nextId = 1;

  async findAll(): Promise<Exercise[]> {
    return [...this.exercises]; // copie du tableau en mémoire
  }

  async save(data: CreateExerciseDto): Promise<Exercise> {
    const exercise = { ...data, id: this.nextId++, created_at: new Date().toISOString() };
    this.exercises.push(exercise);
    return exercise;
  }
  // ...
}
```

### Pourquoi ?
**Problème à résoudre :** Comment tester `ProgressionService.calculateProgressions()` sans lancer un simulateur iOS, sans ouvrir une DB SQLite, sans Expo ?

Si `ProgressionService` dépend directement de `SQLiteExerciseRepository`, tu ne peux pas le tester en isolation — SQLite n'est pas disponible dans Node.js (environnement des tests).

Le Repository Pattern résout ça : `ProgressionService` dépend de `IExerciseRepository` (l'interface), pas de `SQLiteExerciseRepository` (l'implémentation concrète). Dans les tests, tu passes un `InMemoryExerciseRepository`. En production, tu passes un `SQLiteExerciseRepository`.

```typescript
// Test — rapide, pas de DB
const repo = new InMemoryExerciseRepository();
await repo.save({ name: 'Squat', type: 'musculation', ... });
const service = new ProgressionService(repo, ...);
// tester la logique en isolation

// Production — vraie DB
const repo = new SQLiteExerciseRepository(getDb());
const service = new ProgressionService(repo, ...);
```

**Analogie :** L'interface est une prise électrique. Le service ne sait pas si la prise est branchée sur le réseau EDF (SQLite) ou un groupe électrogène (InMemory) — il reçoit juste du 220V. Tu peux changer la source d'énergie sans toucher aux appareils qui s'y branchent.

**Ce que tu apprends ici :** Le principe **Dependency Inversion** (le "D" de SOLID) — les modules de haut niveau (services) ne doivent pas dépendre des modules de bas niveau (SQLite). Tous deux doivent dépendre d'abstractions (interfaces).

---

## 8. Dependency Injection — le constructeur de SessionService

### Ce qu'on a fait
```typescript
// services/SessionService.ts
export class SessionService {
  constructor(
    private sessionLogRepo: ISessionLogRepository,
    private setLogRepo: ISetLogRepository,
    private prRepo: IPersonalRecordRepository,
    private workoutRepo: IWorkoutRepository,
    private weRepo: IWorkoutExerciseRepository,
    private blockRepo: IBlockRepository,
    private setRepo: ISetRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}
```

### Pourquoi passer les repos en paramètre plutôt que les instancier dans le service ?
Si tu faisais ça :
```typescript
// ❌ Mauvais
export class SessionService {
  private setLogRepo = new SQLiteSetLogRepository(getDb()); // couplage fort
  ...
}
```

`SessionService` est maintenant *forcé* d'utiliser SQLite. Tu ne peux jamais le tester sans DB. Et si tu veux un jour stocker les logs dans une autre source de données, tu dois modifier le service lui-même.

En passant les repos au constructeur, le service ne sait pas où viennent les données. Il reçoit des objets qui respectent les interfaces. Tu contrôles depuis l'extérieur ce qu'on lui injecte.

**C'est la Dependency Injection** : les dépendances sont "injectées" depuis l'extérieur plutôt que créées à l'intérieur.

**Dans les tests :**
```typescript
const service = new SessionService(
  new InMemorySessionLogRepository(),
  new InMemorySetLogRepository(),
  new InMemoryPersonalRecordRepository(),
  // ...
);
// Aucune DB, tourne en millisecondes
```

---

## 9. Service Layer — la logique métier séparée de React

### Ce qu'on a fait
```
SessionService    → orchestrer une séance complète
HistoryService    → agréger l'historique pour l'affichage
ProgressionService → calculer volumes, PRs, 1RM par exercice
ExerciseService   → créer/modifier des exercices avec validation
ProgramService    → créer des programmes, gérer l'activation
```

### Pourquoi ne pas mettre cette logique dans les composants React ?
**Problème 1 : testabilité**
Les composants React ne peuvent pas être testés en dehors d'un environnement React (simulateur, Jest avec des mocks complexes). La logique dans un service s'exécute dans Node.js en quelques millisecondes.

**Problème 2 : réutilisabilité**
Si `calculateProgressions` est dans un composant `SummaryScreen`, et que tu veux l'appeler depuis un widget de notification — impossible. Dans un service, c'est une fonction que n'importe qui peut appeler.

**Problème 3 : lisibilité**
Un composant qui mélange affichage et logique métier devient illisible rapidement. 400 lignes de JSX + SQL + calculs + gestion d'état = cauchemar à maintenir.

**Règle pratique :** Si une fonction répond "non" à ces deux questions, elle appartient à un service :
- "A-t-elle besoin d'afficher quelque chose ?"
- "A-t-elle besoin de l'état React (useState, useEffect) ?"

`calculateProgressions` : non, non → service.
`handleSubmit` qui met à jour un spinner → oui → composant ou hook.

---

## 10. Machine à états — useSession

### Ce qu'on a fait
```typescript
// hooks/useSession.ts
export type SessionPhase = 'checkin' | 'running' | 'summary';
```

La séance a exactement trois états possibles, et les transitions sont strictes :

```
checkin  →  (onStart)  →  running  →  (dernière série)  →  summary
```

### Pourquoi une machine à états plutôt que des booléens ?
L'alternative naïve serait :
```typescript
// ❌ Mauvais
const [hasCheckedIn, setHasCheckedIn] = useState(false);
const [isRunning, setIsRunning] = useState(false);
const [isFinished, setIsFinished] = useState(false);
```

Avec trois booléens, tu peux te retrouver dans des états impossibles : `hasCheckedIn = true, isRunning = true, isFinished = true` simultanément. Ton code doit gérer des combinaisons qui ne devraient jamais exister.

Avec `phase: 'checkin' | 'running' | 'summary'`, il y a exactement 3 états possibles. TypeScript t'oblige à les gérer tous les trois. L'état `checkin + running + summary` n'existe pas.

```typescript
// Le composant session — exhaustif et lisible
{session.phase === 'checkin' && <CheckInPhase ... />}
{session.phase === 'running' && <RunningPhase ... />}
{session.phase === 'summary' && <SummaryPhase ... />}
```

**Ce que tu apprends :** Les machines à états (*state machines*) sont un pattern fondamental en programmation. XState est une lib dédiée, mais même sans lib, modéliser ton état comme un enum de phases réduit drastiquement les bugs d'état impossible.

### La navigation dans la séance — advancePosition
```typescript
// hooks/useSession.ts — exportée pour être testable
export function advancePosition(
  position: SessionPosition,
  details: WorkoutExerciseDetail[]
): SessionPosition | null {
  const { exerciseIdx, blockIdx, setIdx } = position;
  const exercise = details[exerciseIdx];
  const block = exercise.blocks[blockIdx];
  
  if (setIdx + 1 < block.sets.length)
    return { exerciseIdx, blockIdx, setIdx: setIdx + 1 };       // série suivante
  if (blockIdx + 1 < exercise.blocks.length)
    return { exerciseIdx, blockIdx: blockIdx + 1, setIdx: 0 };  // bloc suivant
  if (exerciseIdx + 1 < details.length)
    return { exerciseIdx: exerciseIdx + 1, blockIdx: 0, setIdx: 0 }; // exercice suivant
  return null; // fin de séance
}
```

Cette fonction est pure (pas d'effet de bord, même entrée → même sortie) et exportée. Elle peut être testée directement sans aucun React :

```typescript
// tests
expect(advancePosition({ exerciseIdx: 0, blockIdx: 0, setIdx: 1 }, details))
  .toEqual({ exerciseIdx: 0, blockIdx: 0, setIdx: 2 }); // série suivante
```

---

## 11. Hooks custom — le pont entre React et les services

### Ce qu'on a fait
```typescript
// hooks/useExercises.ts
export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const data = await new ExerciseService(...).getAll();
    setExercises(data);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  return { exercises, loading, refresh };
}
```

### Pourquoi des hooks custom ?
**Les composants ont besoin de React** (état, effets). **Les services n'en ont pas besoin** (logique pure). Le hook est le traducteur entre les deux mondes.

Sans hook custom, chaque composant qui veut la liste des exercices devrait :
1. Déclarer ses propres `useState` pour les exercices et le loading
2. Écrire le même `useEffect` pour charger au montage
3. Écrire la même fonction `refresh`

Avec un hook, tu écris ça une fois. Les composants appellent juste `useExercises()` et récupèrent `{ exercises, loading, refresh }`.

**Ce que tu apprends :** Les hooks custom sont essentiellement des fonctions qui encapsulent de la logique stateful React. Ils suivent la même règle que les services : une responsabilité par hook. `useExercises` gère les exercices. `useTimer` gère le chrono. `useSession` gère l'état d'une séance.

---

## 12. useTimer — timestamp absolu vs interval naïf

### Le problème
```typescript
// ❌ Approche naïve — ne fonctionne pas en background
const [remaining, setRemaining] = useState(120);

useEffect(() => {
  const interval = setInterval(() => {
    setRemaining(r => r - 1);
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

Sur mobile, iOS et Android peuvent *suspendre* l'exécution JavaScript quand l'app passe en arrière-plan. L'interval s'arrête. Quand l'utilisateur revient, le timer affiche 118 secondes alors que 45 secondes se sont réellement écoulées.

### Ce qu'on a fait
```typescript
// hooks/useTimer.ts
const endTimeRef = useRef<number | null>(null);

const start = useCallback(() => {
  // stocker le moment de fin dans le futur
  endTimeRef.current = Date.now() + remainingRef.current * 1000;
  setIsRunning(true);
}, []);

const tick = useCallback(() => {
  if (!endTimeRef.current) return;
  // calculer le temps restant par rapport au futur absolu
  const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
  setRemaining(left);
  if (left <= 0) {
    Vibration.vibrate([0, 400, 150, 400]); // double vibration
    setIsRunning(false);
  }
}, []);

// Recalculer au retour en foreground
useEffect(() => {
  const sub = AppState.addEventListener('change', state => {
    if (state === 'active') tick();
  });
  return () => sub.remove();
}, [tick]);
```

La clé : `endTimeRef.current` stocke un *timestamp absolu* (un moment précis dans le futur, en millisecondes depuis l'epoch Unix). Peu importe quand `tick` est appelé, il calcule `endTime - maintenant`. L'OS peut suspendre le thread pendant 5 minutes — au retour, le calcul donne immédiatement le bon résultat.

**Leçon fondamentale :** Ne jamais compter des *événements* pour mesurer le temps. Toujours comparer deux *instants*. C'est valable pour les animations, les timeouts, les performances — partout.

### La double vibration
```typescript
Vibration.vibrate([0, 400, 150, 400]);
// [délai, durée_vib1, pause, durée_vib2]
```
Signal distinctif : deux impulsions courtes séparées par une pause. Le `[0, ...]` = commence immédiatement.

---

## 13. TypeScript strict — le compilateur comme filet de sécurité

### Ce qu'on a fait
```json
// tsconfig.json
{ "compilerOptions": { "strict": true } }
```

### Ce que `strict` active concrètement

**`strictNullChecks`** : la plus importante. Oblige à gérer les valeurs `null` et `undefined` explicitement.

```typescript
// Sans strictNullChecks — bug silencieux
const exercise = await repo.findById(id); // peut retourner null
console.log(exercise.name); // 💥 TypeError: Cannot read property 'name' of null

// Avec strictNullChecks — erreur à la compilation
const exercise = await repo.findById(id); // Promise<Exercise | null>
console.log(exercise.name); // ❌ Erreur TS : Object is possibly null
console.log(exercise?.name ?? 'Inconnu'); // ✓ Gestion explicite
```

**`noImplicitAny`** : interdit les variables sans type inféré.

```typescript
// ❌ Erreur TS
function calculate(weight, reps) { ... } // 'weight' implicitement any

// ✓
function calculate(weight: number, reps: number): number { ... }
```

**`strictFunctionTypes`** : les fonctions de callback sont vérifiées plus strictement.

### Exemple concret dans le projet
```typescript
// db/types.ts
export interface Set {
  id: number;
  block_id: number;
  reps_min: number;
  reps_max: number;
  weight: number | null;  // ← nullable
  weight_type: 'fixed' | 'bodyweight' | 'bar'; // ← union de littéraux
  rest_duration: number;
}
```

`weight: number | null` force tout le code qui utilise `weight` à gérer le cas `null`. `weight_type: 'fixed' | 'bodyweight' | 'bar'` interdit n'importe quelle autre string. TypeScript génère une erreur si tu écris `weight_type: 'cardio'`.

**Ce que tu apprends :** TypeScript strict est un outil de *design*. Il te force à modéliser ton domaine précisément. Un type `number | null` documente une contrainte métier : "le poids est optionnel pour les exercices au poids du corps". La contrainte est dans le code, pas dans un commentaire.

---

## 14. Design tokens — Colors.ts, Radius.ts

### Ce qu'on a fait
```typescript
// constants/Colors.ts
const Colors = {
  light: {
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#0D0D0D',
    textSecondary: '#6B7280',
    primary: '#0D0D0D',
    border: '#E5E7EB',
  },
  dark: {
    background: '#0D0D0D',
    surface: '#1A1A1A',
    text: '#F5F5F5',
    textSecondary: '#9CA3AF',
    primary: '#F5F5F5',
    border: '#374151',
  },
};

// constants/Radius.ts
export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
};
```

### Pourquoi ?
**Problème 1 : le mode sombre**
Si tu hardcodes `color: '#0D0D0D'` dans un composant, en mode sombre tu obtiens du texte noir sur fond noir. Avec `color: colors.text`, la valeur s'adapte automatiquement au thème.

**Problème 2 : la cohérence**
L'app a un `borderRadius: 4` partout (design "sharp"). Si demain tu veux tester un design plus arrondi (8px), tu changes `Radius.sm = 8` → tout le projet suit. Si tu avais hardcodé `4` dans 40 fichiers, c'est 40 rechercher-remplacer avec risques d'erreur.

**Problème 3 : la sémantique**
`Radius.sm` dit *quand* utiliser ce rayon (pour les petits éléments). `4` dit seulement *quelle valeur*. Le token donne du sens.

```typescript
// Dans chaque composant
const colorScheme = useColorScheme();
const colors = Colors[colorScheme ?? 'light'];

// Utilisation
style={{ backgroundColor: colors.surface, borderRadius: Radius.sm }}
```

**Ce que tu apprends :** Le concept de *design system* et de *design tokens*. Figma, Material Design, Apple Human Interface Guidelines — tous utilisent ce principe. Les tokens sont la couche de traduction entre le design et le code.

---

## 15. PressableA11y — accessibilité par construction

### Ce qu'on a fait
```typescript
// components/ui/PressableA11y.tsx
interface PressableA11yProps extends Omit<PressableProps, 'accessibilityLabel' | 'style'> {
  accessibilityLabel: string; // ← obligatoire
  accessibilityRole?: PressableProps['accessibilityRole'];
  style?: ViewStyle | ViewStyle[];
}

export function PressableA11y({ accessibilityLabel, accessibilityRole = 'button', style, children, ...rest }: PressableA11yProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[styles.base, style]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44, // WCAG 2.5.5 — taille minimale zone de tap
    minWidth: 44,
  },
});
```

### Pourquoi un wrapper et pas juste `Pressable` ?

**Problème avec `Pressable` natif :**
```typescript
// ❌ Facile à oublier
<Pressable onPress={handlePress}>
  <Text>Créer un programme</Text>
</Pressable>
// → VoiceOver/TalkBack : "bouton" sans description
// → Zone de tap potentiellement < 44pt
```

**Avec `PressableA11y` :**
```typescript
// ✓ Impossible d'oublier
<PressableA11y
  accessibilityLabel="Créer un programme"  // ← TypeScript refuse si absent
  onPress={handlePress}
>
  <Text>Créer un programme</Text>
</PressableA11y>
```

`accessibilityLabel` est dans `interface PressableA11yProps` sans valeur par défaut et sans `?`. TypeScript refuse de compiler si tu l'omets.

**WCAG 2.5.5** : les cibles tactiles doivent faire au moins 44×44 points CSS (environ 44×44px sur écran standard). C'est une recommandation pour les utilisateurs avec des troubles moteurs — une zone de tap trop petite est inutilisable.

**Ce que tu apprends :** Les *contraintes architecturales* qui forcent les bonnes pratiques valent mieux que les conventions qu'on peut oublier. Plutôt que "rappelle-toi toujours d'ajouter accessibilityLabel", on rend l'oubli *impossible à compiler*.

---

## 16. Flux de données unidirectionnel

### Ce qu'on a fait
```
SQLite
  ↓  (read/write)
Repository  (IExerciseRepository, ISessionLogRepository...)
  ↓  (appels async)
Service  (SessionService, HistoryService...)
  ↓  (appels async)
Hook  (useSession, useHistory...)
  ↓  (state React)
Composant  (RunningPhase, SummaryPhase...)
  ↑  (events : onPress, onValidate...)
Hook  (met à jour l'état, rappelle le service)
```

### Pourquoi ?
**Sans architecture définie**, chaque composant peut faire n'importe quoi :
```typescript
// ❌ Un composant qui fait tout
function RunningPhase() {
  const db = getDb();
  const [exercise, setExercise] = useState(null);
  
  useEffect(() => {
    db.getFirstAsync('SELECT * FROM exercises WHERE id = ?', [id])
      .then(setExercise);
  }, []);

  async function validate() {
    await db.runAsync('INSERT INTO set_logs ...'); // SQL direct dans le composant
    await db.runAsync('UPDATE sets SET weight = ...'); // logique de progression ici aussi
    router.back();
  }
}
```

Ce code "fonctionne" mais :
- Tu ne peux pas tester `validate()` sans afficher le composant
- Si la logique de progression change, tu dois retrouver tous les composants qui la dupliquent
- Un bug dans le calcul du 1RM peut venir de 5 endroits différents

**Avec le flux unidirectionnel :**
- Un bug d'affichage → cherche dans le composant
- Un bug de calcul → cherche dans le service
- Un bug de données → cherche dans le repository
- Un bug de synchronisation → cherche dans le hook

Chaque couche a une responsabilité. Les bugs ont un seul endroit où se cacher.

---

## 17. Singleton DB — getDb()

### Ce qu'on a fait
```typescript
// db/index.ts
let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('training.db');
    _db.execSync('PRAGMA foreign_keys = ON');
  }
  return _db;
}
```

### Pourquoi un singleton ?
Ouvrir une connexion DB a un coût (allocation mémoire, initialisation). Si chaque composant ouvre sa propre connexion à chaque render, tu multiplies les connexions inutilement.

Le singleton garantit une seule connexion partagée pendant toute la vie de l'app. `getDb()` peut être appelé 100 fois, il retourne toujours la même instance.

**Le `if (!_db)`** : "si la connexion n'existe pas encore, crée-la et stocke-la. Sinon, retourne l'existante."

**Attention :** SQLite est mono-thread. On ne peut pas exécuter deux requêtes simultanément sur la même connexion. Expo SQLite gère ça via une queue interne. Pour des cas plus complexes (beaucoup de requêtes parallèles), on utiliserait un pool de connexions — pas nécessaire ici.

---

## 18. Seeds — données initiales

### Ce qu'on a fait

Deux fonctions appelées dans `initDatabase()` à chaque démarrage :

```typescript
// seedExercises — idempotent (skip si exercices existent)
export async function seedExercises(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM exercises');
  if (existing && existing.count > 0) return;
  for (const ex of BASE_EXERCISES) { await db.runAsync('INSERT INTO exercises ...'); }
}

// seedProgram — TOUJOURS supprime et recrée le programme PPL
export async function seedProgram(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM programs'); // CASCADE → workouts → … → sets
  // insère 6 séances + ~50 exercices + blocs + séries
}
```

### Pourquoi deux comportements différents ?

`seedExercises` est idempotent : si l'utilisateur a créé ses propres exercices, on ne les écrase pas.

`seedProgram` re-seed toujours : le programme PPL est "le programme de référence" du développeur-utilisateur. Pendant la phase de test, le schéma évolue (nouvelles colonnes, nouveaux blocs). Un guard `if exists return` empêcherait les mises à jour d'atteindre la DB — le bug s'est manifesté en session 17 (6 séances → bloqué à 4).

**Quand passer à idempotent ?** Quand il y aura de vraies sessions enregistrées (le CASCADE supprime tout l'historique). Pour l'instant, pas de sessions → suppression safe.

### Structure du programme PPL seedé

```
PPL — Push / Pull / Legs
├── Push — Pecs / Épaules / Triceps
│   ├── Mobilité (4 exercices, mob() → duration_seconds)
│   ├── Travail (6 exercices, is_work_block=1)
│   └── Étirements (4 exercices, mob())
├── Footing Mardi — Récupération
│   ├── Footing (cardio, bw(1,1,0))
│   └── Étirements post-footing (5 exercices)
├── Pull — Dos / Biceps / V (même structure que Push)
├── Footing Jeudi — Mobilité (même structure que Footing Mardi)
├── Legs — Jambes (même structure)
└── Bonus — Force couché / Bras / Épaules (même structure)
```

---

## 19. Gestion des erreurs aux frontières

### Ce qu'on a fait
La règle : les erreurs sont catchées aux *frontières* du système, pas à l'intérieur.

**Frontière 1 : les composants (interaction utilisateur)**
```typescript
// add-exercise.tsx
async function handleSubmit() {
  try {
    await create({ name, type, muscle_groups, ... });
    router.back();
  } catch (e) {
    Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de créer l\'exercice.');
  }
}
```

**Frontière 2 : les hooks (protection de l'état React)**
```typescript
// useSession.ts
async function validateSet(actual: SetActual) {
  try {
    await service.logSet(...);
    // avancer dans la séance
  } catch {
    setError('Impossible d\'enregistrer la série.');
    // l'état de la séance reste valide
  }
}
```

**À l'intérieur des services : on laisse les erreurs remonter**
```typescript
// SessionService.ts
async startSession(workoutId: number, checkin: CheckIn): Promise<SessionLog> {
  return this.sessionLogRepo.save({ workout_id: workoutId, ... });
  // pas de try/catch ici — si ça fail, le hook qui appelle startSession gère
}
```

### Pourquoi pas un try/catch partout ?
Un try/catch qui attrape une erreur et la swallow (l'avale sans agir) est pire qu'aucun try/catch — il cache un problème sans le résoudre.

```typescript
// ❌ Dangereux
try {
  await service.logSet(...);
} catch {
  // rien — l'erreur disparaît
}
// Le code continue comme si tout allait bien
```

**L'exception : `calculateProgressions` dans useSession**
```typescript
// useSession.ts
try {
  const progs = await service.calculateProgressions(sessionLogId);
  setProgressions(progs);
} catch {
  setProgressions([]); // ← catch intentionnel avec fallback
}
setPhase('summary'); // ← doit toujours s'exécuter
```

C'est un catch *délibéré avec fallback explicite* : si le calcul de progression échoue (bug dans les données, exercice supprimé entre temps), la séance se termine quand même avec un résumé vide plutôt que de bloquer l'utilisateur sur l'écran de séance.

**Ce que tu apprends :** "Fail fast, fail loudly" — laisser les erreurs remonter à la surface est préférable à les cacher. Attrape les erreurs là où tu peux faire quelque chose d'utile avec.

---

## 20. Conventions de nommage et structure de fichiers

### Ce qu'on a fait

**Fichiers :**
- `PascalCase.tsx` pour les composants React (`RunningPhase.tsx`)
- `camelCase.ts` pour les hooks (`useSession.ts`) et services (`SessionService.ts`)
- `IPascalCase.ts` pour les interfaces de repository (`IExerciseRepository.ts`)
- `SQLitePascalCase.ts` pour les implémentations SQLite
- `InMemoryPascalCase.ts` pour les implémentations test

**Dossiers par domaine (pas par couche technique) :**
```
components/
  session/    ← composants liés à la séance
  workout/    ← composants liés à la config séance
  exercises/  ← composants liés aux exercices
  ui/         ← composants génériques (PressableA11y)
```

Pas `components/buttons/`, `components/cards/`, `components/forms/` — c'est une organisation par type technique qui ne dit rien de ce que fait le code.

### Pourquoi ?
**Localité** : tout ce qui concerne une séance est dans `components/session/` et `hooks/useSession.ts`. Si tu travailles sur le flow de séance, tu n'as pas à chercher dans 5 dossiers différents.

**Lisibilité des imports** :
```typescript
import { RunningPhase } from '@/components/session/RunningPhase';
```
Tu sais immédiatement : c'est un composant, il appartient au domaine session.

---

## 21. Pas de commentaires (ou presque)

### Ce qu'on a fait
Le code source a très peu de commentaires. Les quelques présents expliquent le POURQUOI, jamais le QUOI.

**Commentaire inutile (explique le QUOI) :**
```typescript
// ❌ Inutile — le code dit la même chose
// Calculer le temps restant
const left = Math.ceil((endTimeRef.current - Date.now()) / 1000);
```

**Commentaire utile (explique le POURQUOI non-évident) :**
```typescript
// ✓ Utile — le POURQUOI n'est pas dans le code
// Recalculate when app returns to foreground
// iOS/Android suspend le JS thread en background, l'interval s'arrête
useEffect(() => {
  const sub = AppState.addEventListener('change', state => {
    if (state === 'active') tick();
  });
}, [tick]);
```

### Pourquoi ?
Les commentaires *mentent* avec le temps. Le code évolue, le commentaire reste. Dans 6 mois, tu modifies la fonction mais tu oublies de mettre à jour le commentaire — il décrit maintenant quelque chose qui ne correspond plus à la réalité.

Un bon nom de variable ou de fonction est meilleur qu'un commentaire :
```typescript
// ❌ Besoin d'un commentaire
const x = weight * (1 + reps / 30); // formule d'Epley

// ✓ Pas besoin de commentaire
const estimated1RM = weight * (1 + reps / 30);
```

---

## 22. Pre-commit hook TypeScript

### Ce qu'on a fait
```bash
# .githooks/pre-commit
#!/usr/bin/env bash
set -e
echo "→ TypeScript check..."
cd app && npx tsc --noEmit
echo "✓ Types OK"
```

Activation manuelle une fois :
```bash
git config core.hooksPath .githooks
```

### Pourquoi ?
`tsc --noEmit` vérifie les types TypeScript *sans générer de fichiers JavaScript*. C'est la validation la plus rapide et la plus fiable du code avant un commit.

Sans ce hook, tu peux committer des erreurs TypeScript qui n'apparaissent qu'au runtime ou lors d'une session future. Avec le hook, git *refuse* le commit si TypeScript signale des erreurs.

**`set -e`** : le script s'arrête immédiatement à la première erreur. Si `tsc` retourne un code d'erreur non-zéro, le hook échoue, git refuse le commit.

**`--noEmit`** : vérifie les types sans écrire de fichiers `.js`. Plus rapide, et évite de polluer le repo avec des artefacts de compilation.

**Ce que tu apprends :** Les git hooks sont des scripts qui s'exécutent automatiquement à certains moments du workflow git (pre-commit, pre-push, post-merge...). C'est le mécanisme de base pour automatiser la qualité sans CI.

---

## 23. Catalogue des design patterns utilisés

Un *design pattern* est une solution éprouvée à un problème récurrent de conception logicielle. Le terme vient du livre *Design Patterns* (Gamma & al., 1994, surnommé "le Gang of Four"). Voici les patterns présents dans ce projet, nommés avec leur terme officiel.

---

### Singleton — `getDb()`

**Définition :** Garantir qu'une classe n'a qu'une seule instance et fournir un point d'accès global à cette instance.

```typescript
// db/index.ts
let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('training.db'); // ← créé une seule fois
  }
  return _db;
}
```

**Où dans le projet :** `db/index.ts`
**Problème résolu :** Ouvrir une connexion DB a un coût. On ne veut pas 50 connexions SQLite ouvertes en parallèle.
**Variante utilisée :** Singleton via module (la variable `_db` est un état du module, initialisé paresseusement au premier appel).

---

### Repository Pattern

**Définition :** Encapsuler la logique d'accès aux données derrière une interface qui ressemble à une collection d'objets en mémoire.

```typescript
// Interface — le "contrat"
interface IExerciseRepository {
  findAll(): Promise<Exercise[]>;
  findById(id: number): Promise<Exercise | null>;
  save(data: CreateExerciseDto): Promise<Exercise>;
  delete(id: number): Promise<void>;
}

// Implémentation prod
class SQLiteExerciseRepository implements IExerciseRepository { ... }

// Implémentation test
class InMemoryExerciseRepository implements IExerciseRepository { ... }
```

**Où dans le projet :** `repositories/` (8 interfaces + 8 implémentations SQLite + 8 implémentations InMemory)
**Problème résolu :** Découpler la logique métier (services) de la persistance (SQLite). Permet de tester les services sans DB.
**Relation avec SOLID :** Applique le *Dependency Inversion Principle* et l'*Open/Closed Principle* (ajouter une implémentation Redis ne touche pas le service).

---

### Dependency Injection (DI)

**Définition :** Fournir les dépendances d'un objet depuis l'extérieur plutôt que de les créer à l'intérieur.

```typescript
// ❌ Sans DI — couplage dur
class SessionService {
  private repo = new SQLiteSessionLogRepository(getDb()); // impossible à tester
}

// ✓ Avec DI — couplage faible
class SessionService {
  constructor(
    private sessionLogRepo: ISessionLogRepository,
    private setLogRepo: ISetLogRepository,
    // ...
  ) {}
}

// L'appelant choisit l'implémentation
const service = new SessionService(
  new SQLiteSessionLogRepository(getDb()), // prod
  // ou new InMemorySessionLogRepository() // test
);
```

**Où dans le projet :** Constructeur de `SessionService`, `HistoryService`, `ProgressionService`
**Problème résolu :** Tester `SessionService` avec des dépôts en mémoire, sans base de données.
**Note :** Il existe des *conteneurs DI* (Angular, NestJS, InversifyJS) qui automatisent l'injection. Ici on fait de la DI manuelle — pas de framework nécessaire, le concept est le même.

---

### Factory Method (implicite)

**Définition :** Déléguer la création d'objets à une fonction ou méthode dédiée plutôt que d'appeler `new` partout.

```typescript
// hooks/useSession.ts
function createService(): SessionService {
  const db = getDb();
  return new SessionService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLitePersonalRecordRepository(db),
    // ...
  );
}
```

**Où dans le projet :** Les hooks instancient les services via des fonctions locales.
**Problème résolu :** Centraliser la construction des services complexes (8 dépendances pour `SessionService`). Si une dépendance change, tu modifies un seul endroit.

---

### State Machine (machine à états finis)

**Définition :** Modéliser le comportement d'un système comme un ensemble fini d'états et de transitions autorisées.

```typescript
// hooks/useSession.ts
type SessionPhase = 'checkin' | 'running' | 'summary';
//                        ↑ 3 états, pas plus, pas moins

// Transitions autorisées :
// checkin → running (via onStart)
// running → summary (via dernière série)
// Toute autre transition est impossible par construction
```

**Diagramme :**
```
[checkin] --onStart--> [running] --dernière série--> [summary]
```

**Où dans le projet :** `hooks/useSession.ts`, `SessionPhase`
**Problème résolu :** Eliminer les états impossibles (ex: `isRunning = true` ET `isFinished = true`). TypeScript force la couverture exhaustive de tous les états.
**Lib dédiée qui va plus loin :** XState (pour des machines d'états complexes avec historique, états parallèles, guards).

---

### Bridge / Adapter (pont entre React et les services)

**Définition :** Le Bridge sépare une abstraction de son implémentation pour que les deux puissent varier indépendamment. L'Adapter convertit l'interface d'une classe en une autre interface attendue par le client.

Dans ce projet, les **hooks custom** jouent ce rôle :

```typescript
// useExercises.ts — "pont" entre React et ExerciseService
export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);  // ← monde React
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const data = await new ExerciseService(...).getAll(); // ← monde service (async, pas de React)
    setExercises(data);
    setLoading(false);
  }

  return { exercises, loading, refresh }; // ← interface React-friendly
}
```

**Où dans le projet :** Tous les hooks custom (`useExercises`, `useHistory`, `useProgression`, `useSession`...)
**Problème résolu :** Les composants ne connaissent pas les services. Les services ne connaissent pas React. Le hook traduit entre les deux mondes (async → state, événements → appels de service).

---

### Observer (via React state)

**Définition :** Quand un objet change d'état, tous ses dépendants sont notifiés automatiquement.

React est intrinsèquement basé sur ce pattern : `useState` + `useEffect` est un système d'observation. Quand `setExercises(data)` est appelé, tous les composants qui utilisent `exercises` sont re-rendus.

```typescript
// Le hook publie un changement
setExercises(newData); // ← "notify observers"

// Le composant est un observateur
function ExerciseList() {
  const { exercises } = useExercises(); // ← "subscribe"
  return exercises.map(...); // ← re-rendu automatique quand exercises change
}
```

**Où dans le projet :** Partout via React state. `useFocusEffect` est aussi un Observer : l'écran observe le retour en focus pour rafraîchir les données.
**Problème résolu :** Synchronisation automatique UI ↔ données sans polling manuel.

---

### Résumé visuel des patterns

```
Singleton ──── getDb() : une seule connexion SQLite
     │
Repository ─── IExerciseRepository : interface entre service et DB
     │
     ├── DI ── SessionService(repo1, repo2...) : injecter les dépendances
     │
     ├── Factory ── createService() : construire SessionService
     │
State Machine ─ SessionPhase : 3 états, transitions strictes
     │
Bridge ──────── useExercises() : adapter async service → React state
     │
Observer ─────── useState/useEffect : notifier les composants
```

---

## 24. Pourquoi pas Zustand ou Redux ?

### C'est quoi ?

**Redux** : bibliothèque de gestion d'état global pour JavaScript. Inventée en 2015 pour React. Principe : un store central unique, toutes les mutations passent par des "actions" dispatched, des "reducers" purs transforment le state.

**Zustand** : alternative moderne à Redux (2019). Plus simple, moins de boilerplate, même idée : un store global accessible depuis n'importe quel composant.

```typescript
// Zustand — exemple
const useStore = create((set) => ({
  exercises: [],
  loadExercises: async () => {
    const data = await fetchExercises();
    set({ exercises: data }); // mutation du store global
  },
}));

// N'importe quel composant peut y accéder
function AnyComponent() {
  const { exercises, loadExercises } = useStore();
}
```

### Quel problème Redux/Zustand résout-il ?

Imagine une app où :
- L'utilisateur est connecté (données en mémoire)
- 15 écrans différents ont besoin du profil utilisateur
- Une notification push peut mettre à jour les données n'importe quand
- Le panier d'achat doit persister entre les navigations
- Plusieurs composants imbriqués à des niveaux différents partagent de l'état

Dans ce cas, passer les données de composant en composant via `props` devient cauchemardesque (*prop drilling*). Un store global résout ça : tout le monde lit et écrit dans le même endroit.

### Pourquoi pas ici ?

**1. Il n'y a pas de state global à partager**

```
Écran exercices  →  useExercises() → ExerciseService → SQLite
Écran programmes →  usePrograms()  → ProgramService  → SQLite
Écran séance     →  useSession()   → SessionService  → SQLite
```

Chaque écran a son propre hook qui charge ses propres données. Aucun state n'est partagé entre les onglets. Quand l'utilisateur revient sur un écran, `useFocusEffect` recharge depuis SQLite — la source de vérité.

**2. SQLite est le store global**

```typescript
// Zustand — source de vérité en mémoire RAM
const store = { exercises: Exercise[] }; // perd ses données si l'app redémarre

// Notre approche — source de vérité sur disque
SQLite → exerce à nouveau au prochain lancement
```

Dans une app mobile offline-first, SQLite *est* le store global. Il persiste entre les redémarrages. Il est accessible depuis n'importe quel service via `getDb()`. Ajouter Zustand en plus créerait une *double source de vérité* : SQLite pour la persistance, Zustand pour la RAM — avec le risque de désynchronisation.

**3. YAGNI — on ne résout pas de problème inexistant**

Redux/Zustand ont un coût :
- Apprendre l'API (actions, reducers, selectors, middleware...)
- Comprendre les re-renders liés au store
- Déboguer via Redux DevTools
- Choisir une structure de store au début (difficile de changer)

Pour une app avec 5 écrans et des données locales, c'est beaucoup de complexité pour un problème qui n'existe pas.

### Comparaison directe

| | Notre approche | Zustand | Redux |
|---|---|---|---|
| Source de vérité | SQLite (disque) | Store (RAM) | Store (RAM) |
| Persistance | Automatique | À configurer (redux-persist) | À configurer |
| Partage d'état inter-écrans | Via DB (relecture) | Via store (direct) | Via store (direct) |
| Complexité | Faible | Faible-Moyenne | Élevée |
| Boilerplate | Faible | Faible | Élevé |
| Adapté si... | App offline-first, données locales | Beaucoup d'état UI partagé | App complexe avec équipe |

### Quand utiliser Zustand dans ce projet ?

Si on ajoutait :
- Un état "thème personnalisé" qui doit être accessible partout sans relecture DB
- Une notification globale (banner en haut de l'app partagé entre tous les écrans)
- Un état de synchronisation réseau (offline/online) consommé par 10+ composants

Ces cas n'existent pas encore → YAGNI.

### La règle à retenir

> "Redux/Zustand résolvent le *prop drilling* et la synchronisation d'état cross-composant. Si tu n'as pas ces problèmes, tu n'as pas besoin de ces outils."

SQLite + hooks custom + `useFocusEffect` suffisent pour une app offline-first à données locales.

---

## 25. Modélisation des séries non-reps

### Le problème

Les exercices de mobilité et d'étirement ne se font pas "en répétitions". Un "Child pose 60 secondes" codé comme `reps=60` est un hack : la valeur perd son sens, le UI affiche "60 répétitions", la progression auto essaie d'augmenter le nombre de reps.

### Ce qu'on a fait

**`sets.duration_seconds INTEGER`** (nullable) : si `NULL`, mode reps normal. Si nombre, mode durée — l'UI affiche un décompte, valide avec `repsDone=1`.

```typescript
// seeds.ts
function mob(seconds: number): SetSpec {
  return { reps_min: 1, reps_max: 1, weight: null, weight_type: 'bodyweight', rest: 0, duration_seconds: seconds };
}
```

**`blocks.is_work_block`** : 0 pour les blocs Mobilité et Étirements. La logique de progression (`SessionService.checkAllWorkSetsAchieved`) ignore ces blocs — pas de tentative d'augmenter le poids d'un étirement.

**`exercise.type === 'cardio'`** : troisième mode dans `RunningPhase`. Prioritaire sur `isDuration`. Inputs durée (minutes) + distance (km) stockés dans `set_logs.duration_seconds` et `set_logs.distance_meters`.

### Pourquoi pas une table séparée ?

YAGNI. Une colonne nullable sur `sets` suffit pour deux comportements distincts. Si les types de séances prolifèrent (AMRAP, EMOM, time cap), on réévaluera avec une vraie modélisation (ex: `set_type ENUM`).

### Règle à retenir

> Une colonne nullable peut encoder une alternative binaire. Dès qu'il y a plus de 2 cas, passer à un type enum explicite.

---

## Récapitulatif — les principes derrière les choix

| Principe | Choix qui l'applique |
|---|---|
| **YAGNI** — ne construis pas ce que tu n'as pas besoin | Pas de backend, pas d'ORM, pas de lib de gestion d'état globale |
| **Single Responsibility** — une chose par unité | Repository = accès données, Service = logique, Hook = état React |
| **Dependency Inversion** — dépendre d'abstractions | `IExerciseRepository` plutôt que `SQLiteExerciseRepository` |
| **Dependency Injection** — injecter les dépendances | Constructeur de `SessionService` reçoit les repos en paramètre |
| **Fail fast** — les erreurs remontent à la surface | Try/catch uniquement aux frontières, pas à l'intérieur des services |
| **Immutabilité locale** — ne pas muter l'état directement | `return [...this.exercises]` dans InMemory (copie, pas référence) |
| **Convention over configuration** — la structure dit tout | File-based routing, dossiers par domaine, préfixes `I`/`SQLite`/`InMemory` |
