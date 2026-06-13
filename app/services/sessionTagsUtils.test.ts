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
