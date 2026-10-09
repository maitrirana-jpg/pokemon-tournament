import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContenderRecord } from '../contender-record';
import { TournamentApi } from '../tournament-api';

@Component({
  selector: 'app-statistics-page',
  templateUrl: './statistics-page.html',
})
export class StatisticsPage implements OnInit {
  private readonly api = inject(TournamentApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly contenders = signal<ContenderRecord[]>([]);

  ngOnInit(): void {
    this.api
      .playTournament('wins', 'desc')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((records) => this.contenders.set(records));
  }
}
