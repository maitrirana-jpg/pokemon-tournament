import { ContenderRecord } from './contender-record';
import { sortContenders } from './sort-contenders';

function contender(id: number, name: string, wins: number): ContenderRecord {
  return { id, name, type: 'normal', wins, losses: 15 - wins, ties: 0 };
}

const ids = (records: ContenderRecord[]) => records.map((r) => r.id);

describe('sortContenders', () => {
  const records = [
    contender(3, 'charmander', 9),
    contender(1, 'bulbasaur', 12),
    contender(7, 'squirtle', 9),
    contender(2, 'ivysaur', 4),
  ];

  it('sorts by wins descending, breaking ties by id ascending', () => {
    expect(ids(sortContenders(records, 'wins', 'desc'))).toEqual([1, 3, 7, 2]);
  });

  it('keeps the id tie-break ascending when sorting ascending', () => {
    expect(ids(sortContenders(records, 'wins', 'asc'))).toEqual([2, 3, 7, 1]);
  });

  it('sorts names by code point, like the API, not by locale', () => {
    const named = [contender(1, 'abra', 0), contender(2, 'Zubat', 0), contender(3, 'mew', 0)];

    expect(ids(sortContenders(named, 'name', 'asc'))).toEqual([2, 1, 3]);
  });

  it('does not change the array it is given', () => {
    sortContenders(records, 'id', 'asc');

    expect(ids(records)).toEqual([3, 1, 7, 2]);
  });
});
