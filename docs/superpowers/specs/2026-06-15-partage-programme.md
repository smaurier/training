# Partage de programme — Design

## Contexte

Permettre à un utilisateur de partager un programme complet (workouts, exercices, blocs, séries) avec un autre utilisateur de l'app, sans infrastructure serveur. Deux mécanismes : QR code (programmes légers) et fichier JSON (programmes volumineux ou en fallback).

---

## Décisions de design

| Sujet | Décision | Raison |
|---|---|---|
| Transport | QR code + fallback fichier | UX fluide pour cas courant, robuste pour cas limites |
| Format QR | Deep link `trainingapp://import?data=<base64>` | Un seul QR, deux chemins d'import (caméra native + scanner in-app) |
| Compression | pako deflate (JS pur) | Réduit JSON 5-10KB → ~1-2KB, pas de native module |
| Seuil QR | 2KB payload compressé | Calibrer après mesures réelles sur PPL complet |
| Scanner in-app | expo-camera mode barcode | Standard Expo SDK 54 |
| Conflit nom | Suffixe " (importé)" automatique | YAGNI — pas de dialogue, import non-bloquant |
| ExportService | Réutilisé tel quel pour fallback fichier | Déjà câblé + expo-sharing installé |

---

## Architecture

### Service : `ShareProgramService`

```typescript
class ShareProgramService {
  constructor(
    private programRepo: IProgramRepository,
    private workoutRepo: IWorkoutRepository,
    private workoutExerciseRepo: IWorkoutExerciseRepository,
    private blockRepo: IBlockRepository,
    private setRepo: ISetRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  // Sérialise + compresse un programme complet
  async generatePayload(programId: number): Promise<{ base64: string; sizeBytes: number }>

  // Décompresse + parse + crée le programme en DB
  async importPayload(base64: string): Promise<number> // retourne le nouvel programId

  // Helpers purs (testables sans DB)
  compressPayload(json: string): string   // JSON → deflate → base64
  decompressPayload(base64: string): string // base64 → inflate → JSON
}
```

### Flux envoyeur

```
ProgramDetailScreen
  → bouton "Partager"
  → ShareProgramService.generatePayload(programId)
  → sizeBytes <= 2048
      OUI → affiche ShareQRModal (react-native-qrcode-svg)
      NON → ExportService.exportProgram(programId) + expo-sharing sheet natif
```

### Flux receveur — chemin A (deep link)

```
Caméra native scanne QR
  → URL `trainingapp://import?data=<base64>` ouvre l'app
  → _layout.tsx : useURL() + Linking.addEventListener
  → extrait param `data`
  → ShareProgramService.importPayload(base64)
  → navigation vers le programme importé
```

### Flux receveur — chemin B (scanner in-app)

```
app/scan-programme.tsx
  → expo-camera, mode barcode scanning
  → onBarcodeScanned: extrait data= de l'URL lue
  → ShareProgramService.importPayload(base64)
  → navigation vers le programme importé
```

### Format payload (avant compression)

```json
{
  "v": 1,
  "program": { "name": "PPL", "description": "..." },
  "workouts": [
    {
      "name": "Push",
      "exercises": [
        {
          "name": "Développé couché",
          "blocks": [
            {
              "name": "Travail",
              "is_work": true,
              "sets": [{ "reps_min": 5, "weight": 60, "weight_type": "fixed", "rest_duration": 180 }]
            }
          ]
        }
      ]
    }
  ]
}
```

Champs DB non nécessaires à l'import omis (ids, timestamps, progression_step, etc. → valeurs par défaut DB).

---

## Gestion des conflits

- Programme importé avec nom identique → renommer en `"<nom> (importé)"` automatiquement
- Exercice inconnu → créé à la volée (ExerciseService.create)
- Exercice déjà existant (même nom COLLATE NOCASE) → réutilisé (findByName)

---

## Fichiers touchés

### Nouveau
- `app/services/ShareProgramService.ts`
- `app/services/ShareProgramService.test.ts`
- `app/components/programme/ShareQRModal.tsx`
- `app/app/scan-programme.tsx`

### Modifié
- `app/app/_layout.tsx` — deep link handler (useURL + Linking)
- `app/app/programme/[id].tsx` — bouton "Partager" → ShareQRModal ou expo-sharing
- `app/app/(tabs)/programmes.tsx` — lien vers scan-programme.tsx

### Packages à installer
- `react-native-qrcode-svg`
- `pako` + `@types/pako`
- `expo-camera` (non installé — à ajouter)

### Config app.json à ajouter
```json
{
  "expo": {
    "scheme": "trainingapp"
  }
}
```
Requis pour que le deep link `trainingapp://import?data=...` fonctionne sur iOS et Android.

---

## Tests TDD

### `ShareProgramService.test.ts`
- `compressPayload` : JSON → base64 round-trip fidèle
- `decompressPayload` : base64 → JSON identique
- `generatePayload` : retourne base64 + sizeBytes, structure payload correcte
- `importPayload` : crée programme + workouts + exercises + sets en DB
- `importPayload` conflit nom : suffixe "(importé)"
- Round-trip : generatePayload → importPayload → programme structurellement identique

### Contrat
- `ExerciseRepository.findByName` déjà testé (implémenté en S46)

---

## Hors scope

- Import de fichier JSON depuis Réglages (déjà hors scope de cette feature, pas de backlog item)
- Partage vers des non-utilisateurs de l'app
- Lien partageable en ligne
- QR avec TTL ou révocation
