import { ContenderRecord } from './contender-record';

type Battles = Pick<ContenderRecord, 'wins' | 'losses' | 'ties'>;

/** Share of Battles won, as a whole percent; 0 before any Battle. */
export function winRate({ wins, losses, ties }: Battles): number {
  const battles = wins + losses + ties;
  return battles === 0 ? 0 : Math.round((wins / battles) * 100);
}

export type Medal = '🏆' | '🥈' | '🥉';

/**
 * The medal for a Contender with `wins`, by wins-rank among `allWins`:
 * 🏆 for ranks 1–3, 🥈 for 4–7, 🥉 for 8–12, none below.
 */
export function medalFor(wins: number, allWins: readonly number[]): Medal | null {
  const rank = 1 + allWins.filter((other) => other > wins).length;
  if (rank <= 3) return '🏆';
  if (rank <= 7) return '🥈';
  if (rank <= 12) return '🥉';
  return null;
}

/** A Pokédex-style id, e.g. 25 → "#025". */
export function paddedId(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

/** The front sprite from PokeAPI's sprites repository. */
export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

const fallbackTypeColour = '#6c757d';

const typeColours = new Map<string, string>([
  ['normal', fallbackTypeColour],
  ['fire', '#b02a37'],
  ['water', '#0d6efd'],
  ['electric', '#fd7e14'],
  ['grass', '#198754'],
  ['ice', '#3dd5f3'],
  ['fighting', '#842029'],
  ['poison', '#6f42c1'],
  ['ground', '#a0790f'],
  ['flying', '#6ea8fe'],
  ['psychic', '#a61e4d'],
  ['bug', '#7a9a01'],
  ['rock', '#8d6e3f'],
  ['ghost', '#432874'],
  ['dragon', '#3d0a91'],
  ['dark', '#343a40'],
  ['steel', '#7d8a96'],
  ['fairy', '#d63384'],
]);

/** The badge colour for a Pokémon type, grey for any type not listed. */
export function typeColour(type: string): string {
  return typeColours.get(type) ?? fallbackTypeColour;
}
