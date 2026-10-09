import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ContenderRecord } from './contender-record';

export type TournamentStatus = 'inProgress' | 'complete';

/** A Contender as it entered a Battle. */
export interface BattleContender {
  id: number;
  name: string;
  type: string;
  baseExperience: number;
}

/** One Battle of a round-by-round Tournament. */
export interface Battle {
  id: number;
  round: number;
  first: BattleContender;
  second: BattleContender;
  outcome: 'firstWins' | 'secondWins' | 'tie';
  winnerId: number | null;
  reason: 'typeAdvantage' | 'baseExperience' | 'equalBaseExperience';
}

/** One Round: each Contender's single Battle in it. */
export interface Round {
  number: number;
  battles: Battle[];
}

/** The answer to playing a Round: its Battles and where the Tournament now stands. */
export interface RoundPlayedView {
  round: Round;
  standings: ContenderRecord[];
  roundsPlayed: number;
  status: TournamentStatus;
}

/** A round-by-round Tournament, as returned by the API. */
export interface TournamentView {
  id: string;
  startedAt: string;
  roundsPlayed: number;
  totalRounds: number;
  status: TournamentStatus;
  standings: ContenderRecord[];
}

/** Typed access to the round-by-round Tournament API. */
@Injectable({ providedIn: 'root' })
export class RoundByRoundApiService {
  private readonly http = inject(HttpClient);

  /** Picks 16 Contenders and creates a Tournament with no Rounds played. */
  start(): Observable<TournamentView> {
    return this.http.post<TournamentView>('/pokemon/tournament', null);
  }

  /** Plays the next Round of a Tournament. */
  playNextRound(tournamentId: string): Observable<RoundPlayedView> {
    return this.http.post<RoundPlayedView>(`/pokemon/tournament/${tournamentId}/rounds`, null);
  }
}
