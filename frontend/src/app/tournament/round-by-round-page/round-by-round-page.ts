import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, finalize, map, of, switchMap } from 'rxjs';
import { ContenderCard } from '../contender-card/contender-card';
import { medalFor } from '../contender-display';
import { Battle, Round, RoundByRoundApiService, TournamentView } from '../round-by-round-api';

const reasonLabels: Record<Battle['reason'], string> = {
  typeAdvantage: 'Type advantage',
  baseExperience: 'Higher base experience',
  equalBaseExperience: 'Equal base experience',
};

/** Runs a Tournament one Round at a time. */
@Component({
  selector: 'app-round-by-round-page',
  imports: [ContenderCard, RouterLink],
  templateUrl: './round-by-round-page.html',
})
export class RoundByRoundPage implements OnInit {
  private readonly api = inject(RoundByRoundApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  protected readonly tournament = signal<TournamentView | null>(null);
  protected readonly currentRound = signal<Round | null>(null);
  protected readonly selectedBattle = signal<Battle | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly notFound = signal(false);
  private retry: () => void = () => this.start();

  protected readonly canProcess = computed(
    () => !this.loading() && this.tournament()?.status === 'inProgress',
  );

  /** Every Round of the Tournament, in order, marking which have been played. */
  protected readonly roundStrip = computed(() => {
    const tournament = this.tournament();
    if (!tournament) return [];
    return Array.from({ length: tournament.totalRounds }, (_, i) => ({
      number: i + 1,
      played: i < tournament.roundsPlayed,
    }));
  });

  protected readonly roundsLeft = computed(() => {
    const tournament = this.tournament();
    return tournament ? tournament.totalRounds - tournament.roundsPlayed : 0;
  });

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

  /** Opened as /tournament/:id, the page resumes that stored Tournament. */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.resume(id);
  }

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

  /** Loads a stored Tournament together with its newest Round, which is shown by default. */
  private resume(tournamentId: string): void {
    this.run(
      () => this.resume(tournamentId),
      this.api.getTournament(tournamentId).pipe(
        switchMap((tournament) =>
          tournament.roundsPlayed === 0
            ? of({ tournament, round: null })
            : this.api.getRound(tournament.id, tournament.roundsPlayed).pipe(
                // Losing the newest Round must not hide the Tournament: show it without one.
                catchError(() => of(null)),
                map((round) => ({ tournament, round })),
              ),
        ),
      ),
      ({ tournament, round }) => {
        this.tournament.set(tournament);
        this.currentRound.set(round);
      },
      true,
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
        this.selectedBattle.set(null);
      },
    );
  }

  protected reviewRound(roundNumber: number): void {
    const tournament = this.tournament();
    if (!tournament) return;
    this.run(
      () => this.reviewRound(roundNumber),
      this.api.getRound(tournament.id, roundNumber),
      (round) => {
        this.currentRound.set(round);
        this.selectedBattle.set(null);
      },
    );
  }

  protected reviewBattle(battleId: number): void {
    const tournament = this.tournament();
    if (!tournament) return;
    this.run(
      () => this.reviewBattle(battleId),
      this.api.getBattle(tournament.id, battleId),
      (battle) => this.selectedBattle.set(battle),
    );
  }

  protected reasonLabel(battle: Battle): string {
    return reasonLabels[battle.reason];
  }

  protected tryAgain(): void {
    this.retry();
  }

  protected winnerName(battle: Battle): string | null {
    if (battle.winnerId === null) return null;
    return battle.winnerId === battle.first.id ? battle.first.name : battle.second.name;
  }

  /**
   * Sends a request with the shared loading and error handling. Only loading the Tournament
   * itself passes `missingTournamentOn404`, so a 404 there means the Tournament doesn't exist.
   */
  private run<T>(
    retry: () => void,
    request: Observable<T>,
    apply: (result: T) => void,
    missingTournamentOn404 = false,
  ): void {
    this.retry = retry;
    this.failed.set(false);
    this.notFound.set(false);
    this.loading.set(true);
    request
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: apply,
        error: (error: unknown) => {
          if (
            missingTournamentOn404 &&
            error instanceof HttpErrorResponse &&
            error.status === 404
          ) {
            this.notFound.set(true);
          } else {
            this.failed.set(true);
          }
        },
      });
  }
}
