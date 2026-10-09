import { ContenderRecord } from './contender-record';
import { SortDirection, SortField } from './tournament-api';

/**
 * Orders Contenders by the same rules as the API: by `field` in `direction`,
 * with equal values ordered by `id` ascending. Returns a new array.
 */
export function sortContenders(
  contenders: readonly ContenderRecord[],
  field: SortField,
  direction: SortDirection,
): ContenderRecord[] {
  const sign = direction === 'desc' ? -1 : 1;
  return [...contenders].sort((a, b) => sign * compare(a[field], b[field]) || a.id - b.id);
}

// Strings compare by UTF-16 code unit, matching the API's ordinal comparison.
function compare(a: number | string, b: number | string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
