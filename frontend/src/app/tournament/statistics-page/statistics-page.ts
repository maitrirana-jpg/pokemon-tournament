import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
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
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  ngOnInit(): void {
    this.play();
  }

  protected play(): void {
    this.failed.set(false);
    this.loading.set(true);
    this.api
      .playTournament('wins', 'desc')
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (records) => this.contenders.set(records),
        error: () => this.failed.set(true),
      });
  }
}
