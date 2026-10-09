import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { ContenderCard } from '../contender-card/contender-card';
import { medalFor } from '../contender-display';
import { Battle, Round, RoundByRoundApiService, TournamentView } from '../round-by-round-api';

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
  protected readonly currentRound = signal<Round | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  private retry: () => void = () => this.start();

  protected readonly canProcess = computed(
    () => !this.loading() && this.tournament()?.status === 'inProgress',
  );

  /** Medals only mean something once a Round has been played. */
  protected readonly cards = computed(() => {
    const tournament = this.tournament();
    if (!tournament) return [];
    const allWins = tournament.standings.map((c) => c.wins);
    return tournament.standings.map((contender) => ({
      contender,
      medal: tournament.roundsPlayed > 0 ? medalFor(contender.wins, allWins) : null,
    }));
  });

  protected start(): void {
    this.run(
      () => this.start(),
      this.api.start(),
      (tournament) => {
        this.tournament.set(tournament);
        this.currentRound.set(null);
      },
    );
  }

  protected processRound(): void {
    const tournament = this.tournament();
    if (!tournament) return;
    this.run(
      () => this.processRound(),
      this.api.playNextRound(tournament.id),
      (played) => {
        this.tournament.set({
          ...tournament,
          standings: played.standings,
          roundsPlayed: played.roundsPlayed,
          status: played.status,
        });
        this.currentRound.set(played.round);
      },
    );
  }

  protected tryAgain(): void {
    this.retry();
  }

  protected winnerName(battle: Battle): string | null {
    if (battle.winnerId === null) return null;
    return battle.winnerId === battle.first.id ? battle.first.name : battle.second.name;
  }

  private run<T>(retry: () => void, request: Observable<T>, apply: (result: T) => void): void {
    this.retry = retry;
    this.failed.set(false);
    this.loading.set(true);
    request
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: apply, error: () => this.failed.set(true) });
  }
}
