import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ContenderRecord } from './contender-record';

export type TournamentStatus = 'inProgress' | 'complete';

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
}
