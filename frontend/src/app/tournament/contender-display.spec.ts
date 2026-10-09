import { medalFor, paddedId, spriteUrl, typeColour, winRate } from './contender-display';

describe('winRate', () => {
  it('is wins over all Battles as a whole percent', () => {
    expect(winRate({ wins: 9, losses: 2, ties: 1 })).toBe(75);
  });
});

describe('medalFor', () => {
  // Wins for 13 Contenders, one per wins-rank 1–13.
  const field = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3];

  it.each([
    [15, '🏆'],
    [13, '🏆'],
    [12, '🥈'],
    [9, '🥈'],
    [8, '🥉'],
    [4, '🥉'],
    [3, null],
  ])('gives %i wins the medal %s', (wins, medal) => {
    expect(medalFor(wins, field)).toBe(medal);
  });

  it('ranks tied wins together, so the next Contender skips the shared ranks', () => {
    // In any order: ranks are 15 → 1, 14 → 2, 13 → 3 (twice), 12 → 5.
    const tied = [12, 13, 15, 14, 13];

    expect(medalFor(13, tied)).toBe('🏆');
    expect(medalFor(12, tied)).toBe('🥈');
  });

  it('keeps a tie straddling ranks 7 and 8 in the higher tier', () => {
    // Six Contenders above, then two on 9 wins sharing rank 7.
    const tied = [15, 14, 13, 12, 11, 10, 9, 9, 8];

    expect(medalFor(9, tied)).toBe('🥈');
    expect(medalFor(8, tied)).toBe('🥉');
  });
});

describe('paddedId', () => {
  it.each([
    [1, '#001'],
    [25, '#025'],
    [151, '#151'],
  ])('shows %i as %s', (id, shown) => {
    expect(paddedId(id)).toBe(shown);
  });
});

describe('spriteUrl', () => {
  it("points at the front sprite in PokeAPI's sprites repository", () => {
    expect(spriteUrl(25)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    );
  });
});

describe('typeColour', () => {
  it.each([
    ['water', '#0d6efd'],
    ['fire', '#b02a37'],
    ['normal', '#6c757d'],
  ])('colours a %s badge %s', (type, colour) => {
    expect(typeColour(type)).toBe(colour);
  });

  it('falls back to grey for a type it does not know', () => {
    expect(typeColour('stellar')).toBe('#6c757d');
  });
});
