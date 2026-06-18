# Mesures corporelles — Design

## Contexte

Permettre le suivi de métriques corporelles (poids, circonférences) avec visualisation de l'évolution dans le temps. Basé sur la littérature (Schoenfeld, Israetel, Lean et al. / WHO). Intégré comme 3e segment dans l'onglet Progression existant.

---

## Métriques retenues

| Métrique | Justification |
|---|---|
| Poids | Baseline universel |
| Tour de taille | Meilleur proxy graisse viscérale (Lean et al. 1995/1998, WHO) |
| Tour de bras (fléchi) | Marqueur hypertrophie haut du corps (Schoenfeld 2010) |
| Tour de cuisse | Hypertrophie quadriceps |
| Tour de hanches | Composition bas du corps |

**Exclues :** IMC (trompeur pour athlètes), % graisse corporelle (imprecis sans DEXA).

Toutes les métriques sont **optionnelles** à chaque saisie, y compris le poids. L'utilisateur entre uniquement ce qu'il a mesuré ce jour-là. Métriques jamais saisies = masquées dans l'UI.

---

## Décisions de design

| Sujet | Décision | Raison |
|---|---|---|
| Placement | 3e segment `Historique \| Stats \| Corps` dans Progression | 6 onglets = barre chargée sur petits écrans |
| Rythme saisie | Tout optionnel à chaque entrée | Rythmes différents (poids quotidien vs circonférences hebdomadaires) + philosophie non-punitive |
| Unicité | UNIQUE sur `date` → upsert si même date | Pas de doublons par jour |
| Unités | Adaptées aux réglages app (kg/lbs, cm/in) | Cohérence avec le reste de l'app |
| Métriques vides | Masquées (pas de graphique vide) | UX propre, pas d'encombrement |
| Fenêtre graphique | 8 semaines glissantes | Assez pour voir une tendance |

---

## Schéma DB

### Migration v15

```sql
CREATE TABLE IF NOT EXISTS body_measurements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL UNIQUE,
  weight_kg   REAL,
  waist_cm    REAL,
  arm_cm      REAL,
  thigh_cm    REAL,
  hip_cm      REAL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## Architecture

### Types

```typescript
export interface BodyMeasurement {
  id: number;
  date: string;           // 'YYYY-MM-DD'
  weight_kg: number | null;
  waist_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  hip_cm: number | null;
  created_at: string;
}

export type CreateBodyMeasurementDto = Omit<BodyMeasurement, 'id' | 'created_at'>;
```

### Repository : `IBodyMeasurementRepository`

```typescript
interface IBodyMeasurementRepository {
  save(dto: CreateBodyMeasurementDto): Promise<BodyMeasurement>;  // upsert par date
  getHistory(limit?: number): Promise<BodyMeasurement[]>;         // DESC par date
  getLatest(): Promise<BodyMeasurement | null>;
}
```

### Service : `BodyMeasurementService`

```typescript
class BodyMeasurementService {
  save(dto): Promise<BodyMeasurement>    // délègue au repo
  getHistory(limit?): Promise<BodyMeasurement[]>
  getLatest(): Promise<BodyMeasurement | null>
}
```

### Hook : `useBodyMeasurements`

```typescript
{
  measurements: BodyMeasurement[];
  latest: BodyMeasurement | null;
  isLoading: boolean;
  error: string | null;
  refresh(): void;
}
```

---

## UI — segment "Corps"

### Carte "Dernières mesures"
- Affiche uniquement les métriques ayant au moins une valeur historique
- Format : label + valeur + date de la dernière mesure
- Bouton "Ajouter une mesure" → BottomSheet

### BottomSheet ajout
- Date : aujourd'hui par défaut, modifiable (TextInput YYYY-MM-DD ou DatePicker)
- 5 champs numériques optionnels (tous nullable)
- Unités affichées selon réglages (kg ou lbs, cm ou in)
- Bouton "Enregistrer" → `BodyMeasurementService.save()`

### Graphiques
- Un graphique ligne par métrique ayant ≥ 2 points de données
- `react-native-gifted-charts` (déjà installé)
- Fenêtre 8 semaines glissantes
- Axe X : dates, axe Y : valeur dans l'unité de l'app
- Métriques avec 0 ou 1 point = pas de graphique (afficher valeur seule ou rien)

---

## Fichiers touchés

### Nouveau
- `app/db/types.ts` — types `BodyMeasurement`, `CreateBodyMeasurementDto`
- `app/repositories/IBodyMeasurementRepository.ts`
- `app/repositories/InMemoryBodyMeasurementRepository.ts`
- `app/repositories/SQLiteBodyMeasurementRepository.ts`
- `app/repositories/bodyMeasurementRepository.contract.ts`
- `app/services/BodyMeasurementService.ts`
- `app/services/BodyMeasurementService.test.ts`
- `app/hooks/useBodyMeasurements.ts`
- `app/components/progression/AddMeasurementSheet.tsx`
- `app/components/progression/BodyMeasurementChart.tsx`
- `app/components/progression/LatestMeasurementsCard.tsx`

### Modifié
- `app/db/schema.ts` — migration v15
- `app/app/(tabs)/progression.tsx` — 3e segment "Corps" + section Corps

---

## Tests TDD

### `bodyMeasurementRepository.contract.ts`
- `save` : crée une mesure
- `save` même date (upsert) : met à jour, ne duplique pas
- `getHistory` : ordre DESC par date
- `getHistory(limit)` : retourne max N entrées
- `getLatest` : retourne la plus récente
- `getLatest` sans données : retourne null

### `BodyMeasurementService.test.ts`
- Délègue correctement au repo pour chaque méthode
- `save` avec valeurs partielles (certains champs null)

---

## Hors scope

- Objectifs / cibles pour les mesures corporelles
- Rappels de saisie (traité dans la feature Notifications)
- Import depuis Apple Health / Google Fit (supprimé — YAGNI)
- Graphique avec courbe de tendance / régression
- Export des mesures corporelles
