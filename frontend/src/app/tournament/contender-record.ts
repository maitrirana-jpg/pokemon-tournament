/** A Contender's Record at the end of a Tournament, as returned by the API. */
export interface ContenderRecord {
  id: number;
  name: string;
  type: string;
  wins: number;
  losses: number;
  ties: number;
}
