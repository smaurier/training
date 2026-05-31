# Justification des choix architecturaux

> Document pédagogique — explique le POURQUOI de chaque décision technique du projet Trace.

---

## 1. React Native + Expo

**Choix :** React Native pour le moteur, Expo comme couche d'outillage.

**Pourquoi React Native plutôt qu'une app web ?**
On veut une app mobile native : accès aux vibrations, au timer en background, au stockage local SQLite performant. Une Progressive Web App ne peut pas faire tout ça de façon fiable sur iOS.

**Pourquoi Expo plutôt que "bare" React Native ?**
Expo gère la compilation, les mises à jour OTA, les permissions, les polices, et des dizaines de dépendances natives complexes à configurer. Pour un projet solo MVP, passer une semaine à configurer un build natif n'a aucune valeur. Expo te sort de cette complexité le temps que tu en aies besoin.

**La contrepartie :** Expo SDK impose une version fixe de React Native. On ne peut pas utiliser n'importe quelle lib native. Acceptable pour ce projet.

---

## 2. Expo Router (navigation file-based)

**Choix :** La navigation est définie par la structure des fichiers dans `app/`.

**Pourquoi ?**
En React Native "classique", la navigation se configure manuellement dans un fichier centralisé (React Navigation). Avec Expo Router, `app/programme/[id].tsx` devient automatiquement la route `/programme/123`. Même principe que Next.js.

**Avantage concret :** Tu sais où est l'écran en regardant l'URL. Tu n'as pas à chercher dans un fichier de routes.

**Concept clé :** `[id]` dans le nom de fichier = paramètre dynamique. `(tabs)/` = groupe sans impact sur l'URL. `_layout.tsx` = layout partagé par tous les écrans du dossier.

---

## 3. SQLite local (expo-sqlite) — architecture "local-first"

**Choix :** Toutes les données sur l'appareil, pas de serveur.

**Pourquoi SQLite et pas AsyncStorage ?**
AsyncStorage = dictionnaire clé/valeur. Pratique pour quelques préférences, mais inutilisable pour des données relationnelles (exercices → blocs → séries → logs). SQLite = vraie base de données relationnelle avec des requêtes JOIN, des contraintes, des index.

**Pourquoi pas un backend (Firebase, Supabase…) ?**
Trois raisons :
1. **Complexité** — authentification, sécurité, gestion des erreurs réseau, offline — tout ça aurait doublé le temps de dev du MVP.
2. **Données personnelles sensibles** — les données de santé d'un utilisateur solo n'ont pas besoin de passer sur un serveur tiers.
3. **YAGNI** (You Aren't Gonna Need It) — tu n'as qu'un utilisateur (toi). Un backend pour une app solo, c'est over-engineering.

**La contrepartie :** Pas de sync entre appareils. Les données disparaissent si tu désinstalles l'app sans sauvegarde. Problème V2.

---

## 4. Migrations versionnées (PRAGMA user_version)

**Choix :** La DB evolue via un tableau de migrations numérotées, versionné avec `PRAGMA user_version`.

**Pourquoi ?**
Quand l'app est installée sur un appareil, la DB existe déjà. Si tu changes le schéma (ajouter une colonne, une table), tu ne peux pas juste "recréer" la DB — tu perdrais toutes les données de l'utilisateur.

`PRAGMA user_version` stocke un numéro de version dans la DB elle-même. Au démarrage, le code compare sa version avec celle de la DB. S'il y a un écart, il applique les migrations manquantes dans l'ordre.

**Analogie :** C'est exactement ce que font Django migrations, Rails migrations, Flyway — mais en manuel, sans ORM.

**Pourquoi pas un ORM (Drizzle, TypeORM) ?**
Expo SQLite est une lib bas niveau. Les ORMs pour React Native en 2024 sont soit immatures, soit incompatibles avec Expo. Le SQL manuel est plus lisible et plus fiable ici.

---

## 5. Repository Pattern

**Choix :** Chaque table a une interface (`IExerciseRepository`) et deux implémentations : `InMemoryExerciseRepository` (tests) et `SQLiteExerciseRepository` (production).

C'est l'un des choix les plus importants du projet.

**Problème que ça résout :**
Comment tester la logique métier (ex: "est-ce qu'une progression se déclenche correctement ?") sans avoir une vraie DB SQLite dans les tests ?

**Solution :** On définit un contrat (l'interface) que la DB doit respecter. Pour les tests, on crée une implémentation qui stocke les données en mémoire (RAM). La logique métier ne sait pas si elle parle à SQLite ou à la RAM — elle parle à l'interface.

```
Interface IExerciseRepository
    findAll() → Exercise[]
    findById(id) → Exercise | null
    save(data) → Exercise

InMemoryExerciseRepository   →  stocke dans un tableau JS
SQLiteExerciseRepository     →  stocke dans SQLite
```

**Avantage concret :** Les tests tournent en millisecondes sans accès disque, sans Expo, sans simulateur. Tu peux tester `ProgressionService` avec des données fabriquées en 2 lignes.

**Analogie :** C'est comme brancher un câble HDMI. La TV (la logique métier) ne sait pas si l'autre bout est un ordi, une console ou un lecteur BluRay — elle demande juste une image en 1080p (l'interface).

---

## 6. Service Layer

**Choix :** La logique métier complexe vit dans des services (`SessionService`, `HistoryService`, `ProgressionService`), pas dans les composants React.

**Pourquoi ?**
Un composant React a un rôle : afficher des données et réagir aux interactions. Si tu mets la logique "comment calculer une progression" dans un composant, tu ne peux pas la tester sans afficher l'écran. Et si tu la dupliques dans deux composants, tu auras deux bugs à corriger au lieu d'un.

**Règle de base :** Ce qui peut être testé sans React va dans un service. Ce qui ne peut pas être affiché sans React reste dans un composant.

**Exemple concret :**
`SessionService.calculateProgressions()` calcule si les poids doivent augmenter après une séance. Ce calcul est complexe, il dépend de plusieurs tables. Il est testé en isolation dans `progression.test.ts` — sans aucun composant, sans aucun écran.

---

## 7. Hooks custom

**Choix :** Les interactions entre React et les services passent par des hooks (`useSession`, `useTimer`, `useWorkoutExercises`).

**Pourquoi ?**
Les composants ont besoin d'état React (useState, useEffect). Les services n'ont pas d'état React. Les hooks font le pont : ils appellent les services, gèrent l'état local, et exposent un objet simple au composant.

```
Composant  →  hook (state React + appel service)  →  service (logique pure)  →  repository (données)
```

**Analogie :** Le composant est le chauffeur. Le hook est le GPS. Le service est la carte. Le repository est le terrain réel.

---

## 8. useTimer — timestamp absolu

**Choix :** Le timer ne décompte pas avec `setInterval(1000)` — il calcule `endTime - Date.now()` à chaque tick.

**Pourquoi ?**
Sur mobile, quand l'app passe en arrière-plan, iOS/Android suspend le thread JavaScript. Un interval qui comptait à rebours s'arrête. Quand l'utilisateur revient, le timer affiche le mauvais temps.

Avec un timestamp absolu (`endTime = Date.now() + duration * 1000`), peu importe quand tu lis le timer : tu calcules toujours le temps réel restant. Même après 5 minutes en background, le résultat est correct.

**Leçon générale :** Ne jamais compter des événements pour mesurer le temps. Toujours comparer deux moments.

---

## 9. TypeScript strict

**Choix :** `strict: true` dans `tsconfig.json` — le compilateur est maximaliste sur les erreurs de types.

**Pourquoi ?**
TypeScript sans `strict` est du JavaScript avec des types optionnels. Beaucoup de bugs courants passent quand même :
- Une variable potentiellement `null` utilisée sans vérification → crash runtime
- Un paramètre optionnel ignoré → comportement inattendu

Avec `strict`, le compilateur te force à gérer tous les cas. C'est plus contraignant au début, mais ça élimine une catégorie entière de bugs avant même d'exécuter le code.

**En pratique :** Le `0 erreurs TypeScript` vérifié à chaque session était un filet de sécurité réel — plusieurs bugs ont été détectés à la compilation avant d'atteindre l'app.

---

## 10. Design tokens (Colors.ts, Radius.ts)

**Choix :** Toutes les valeurs visuelles (couleurs, border-radius) sont des constantes nommées, jamais des valeurs hardcodées dans les composants.

**Pourquoi ?**
Si tu hardcodes `borderRadius: 4` dans 40 composants, changer le rayon = modifier 40 fichiers. Avec `Radius.sm`, tu modifies une ligne et tout le projet suit.

Même chose pour les couleurs : `colors.primary` s'adapte automatiquement au mode sombre/clair. `'#0D0D0D'` hardcodé dans un composant reste noir même en mode clair.

**Concept clé :** Un token de design est un nom qui donne du sens à une valeur. `colors.textSecondary` dit QUOI, `#6B7280` dit seulement QUELLE couleur.

---

## 11. PressableA11y

**Choix :** Tous les éléments cliquables passent par un composant `PressableA11y` au lieu de `TouchableOpacity` ou `Pressable` natifs.

**Pourquoi ?**
Ce composant enforce trois règles :
1. `accessibilityLabel` est obligatoire (le compilateur refuse s'il manque)
2. `accessibilityRole="button"` par défaut
3. `minHeight: 44, minWidth: 44` — taille minimale WCAG pour les zones de tap

Sans ce wrapper, il est trop facile d'oublier ces propriétés sur un bouton. Le composant rend l'oubli impossible.

**Leçon :** Les contraintes architecturales qui forcent les bonnes pratiques valent mieux que les conventions qu'on oublie d'appliquer.

---

## 12. ON DELETE CASCADE

**Choix :** Supprimer un programme supprime automatiquement ses séances, exercices, blocs, séries, et logs associés.

**Pourquoi ?**
Sans `ON DELETE CASCADE`, supprimer un programme laisse des données orphelines dans toutes les tables liées — des lignes qui pointent vers un parent qui n'existe plus. La DB devient incohérente silencieusement.

`ON DELETE CASCADE` délègue ce nettoyage à SQLite, qui garantit la cohérence en une opération atomique. Aucun code applicatif à maintenir.

**La règle :** Si une entité n'a pas de sens sans son parent, utilise CASCADE. Un bloc sans exercice n'a pas de sens. Une série sans bloc n'a pas de sens.

---

## 13. Pas de commentaires dans le code

**Choix :** Le code source n'a (presque) pas de commentaires.

**Pourquoi ?**
Un commentaire qui explique QUOI fait le code est un signe que le code n'est pas assez lisible. Un bon nom de fonction ou de variable est meilleur qu'un commentaire.

Les commentaires qui restent expliquent le POURQUOI non-évident : un contournement de bug spécifique, une contrainte cachée, un comportement surprenant.

**Exemple :** `// Recalculate when app returns to foreground` dans `useTimer` — le QUOI est évident (c'est dans le code), le POURQUOI (l'OS suspend le JS thread) ne l'est pas.

---

## 14. Flux de données unidirectionnel

**Choix :** Les données circulent dans un seul sens : DB → repository → service → hook → composant.

```
SQLite
  ↓
Repository (IExerciseRepository)
  ↓
Service (ExerciseService)
  ↓
Hook (useExercises)
  ↓
Composant (ExercicesScreen)
```

**Pourquoi ?**
Si un composant modifie directement la DB, tu as 40 composants qui peuvent changer l'état de l'app de façon imprévisible. Un bug peut venir de n'importe où.

Avec un flux unidirectionnel, tu sais exactement où chercher : si l'écran affiche une mauvaise valeur, c'est dans le hook. Si le calcul est faux, c'est dans le service. Si la DB retourne les mauvaises données, c'est dans le repository.

**Leçon générale :** Contraindre les chemins de communication dans un logiciel réduit l'espace où les bugs peuvent se cacher.
