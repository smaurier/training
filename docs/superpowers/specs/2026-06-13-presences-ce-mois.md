# Spec — Présences ce mois

**Date :** 2026-06-13
**Statut :** Approuvé

---

## Contexte

L'onglet Stats n'indique pas combien de fois l'utilisateur s'est entraîné ce mois-ci. Ajouter un compteur additif — factuel, personnel, jamais culpabilisant — aligne la feature sur la philosophie anti-streak : célébrer la présence, sans jamais punir l'absence.

---

## Règles de gestion

- **Comptées :** sessions avec `status = 'completed'` et `started_at` dans le mois calendaire courant (même année, même mois ISO).
- **Exclues :** `abandoned`, `active`, `paused` — une session non terminée n'est pas une présence.
- **Mois calendaire** : pas de rolling 30j — "ce mois" est plus intuitif.
- **Si 0 :** rien n'est affiché. Pas de "0 séance", pas de message d'absence.
- **Jamais de comparaison** : pas de delta vs mois précédent, pas de streak, pas de "objectif atteint".

---

## Copy

```
3 séances ce mois
```

Singulier si 1 : `1 séance ce mois`. Pluriel sinon.

---

## Architecture

### Service — `ProgressionService.getMonthlyPresences(now = new Date()): Promise<number>`

- `sessionLogRepo.findAll()` — récupère tous les logs
- Filtre : `status === 'completed'` ET `new Date(log.started_at).getFullYear() === now.getFullYear()` ET `new Date(log.started_at).getMonth() === now.getMonth()`
- Retourne le count (entier)

### Hook — `useProgression`

- `monthlyPresences: number` ajouté comme 6e slot dans le `Promise.all` existant
- Exposé dans `UseProgressionReturn`

### UI — `app/app/(tabs)/progression.tsx`

- Segment Stats — card en tête de liste, avant `VolumeBarChart`
- Rendu conditionnel : `{monthlyPresences > 0 && <PresencesCard count={monthlyPresences} />}`
- Pas de composant dédié — texte inline dans progression.tsx suffit (1-2 lignes)

---

## Tests TDD — `ProgressionService.getMonthlyPresences`

4 cas :

1. **Aucune session** → retourne 0
2. **Sessions completed du mois courant** → retourne le bon count
3. **Sessions abandoned / active / paused exclues** → non comptées
4. **Sessions du mois précédent exclues** → non comptées

---

## Hors scope

- Comparaison avec mois précédent
- Objectif mensuel configurable
- Graphe historique des présences mois par mois
- Notifications / rappels
