import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ContenderCard } from '../contender-card/contender-card';
import { RoundByRoundApiService, TournamentView } from '../round-by-round-api';

/** Runs a Tournament one Round at a time. */
@Component({
  selector: 'app-round-by-round-page',
  imports: [ContenderCard, RouterLink],
  templateUrl: './round-by-round-page.html',
})
export class RoundByRoundPage {
  private readonly api = inject(RoundByRoundApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tournament = signal<TournamentView | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  protected start(): void {
    this.failed.set(false);
    this.loading.set(true);
    this.api
      .start()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (tournament) => this.tournament.set(tournament),
        error: () => this.failed.set(true),
      });
  }
}
