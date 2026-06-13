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
