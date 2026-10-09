import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ContenderRecord, SortDirection, SortField } from './contender-record';

/** Typed access to the Tournament API. */
@Injectable({ providedIn: 'root' })
export class TournamentApi {
  private readonly http = inject(HttpClient);

  /** Plays a new Tournament and returns every Contender's Record. */
  playTournament(sortBy: SortField, sortDirection: SortDirection): Observable<ContenderRecord[]> {
    return this.http.get<ContenderRecord[]>('/pokemon/tournament/statistics', {
      params: { sortBy, sortDirection },
    });
  }
}
