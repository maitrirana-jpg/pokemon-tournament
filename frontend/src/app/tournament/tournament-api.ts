import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ContenderRecord } from './contender-record';

export type SortField = 'wins' | 'losses' | 'ties' | 'name' | 'id';
export type SortDirection = 'asc' | 'desc';

/** Typed access to the Tournament API. */
@Injectable({ providedIn: 'root' })
export class TournamentApiService {
  private readonly http = inject(HttpClient);

  /** Plays a new Tournament and returns every Contender's Record. */
  playTournament(sortBy: SortField, sortDirection: SortDirection): Observable<ContenderRecord[]> {
    return this.http.get<ContenderRecord[]>('/pokemon/tournament/statistics', {
      params: { sortBy, sortDirection },
    });
  }
}
