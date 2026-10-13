import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  EMPTY,
  Observable,
  catchError,
  expand,
  finalize,
  last,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { BATTLE_REPLAY_STEP_MS, BattleArena } from '../battle-arena/battle-arena';
import { ContenderCard } from '../contender-card/contender-card';
import { medalFor, spriteUrl, typeColour } from '../contender-display';
import { ContenderListing } from '../contender-listing';
import { ListingControls } from '../listing-controls/listing-controls';
import { ListingPager } from '../listing-pager/listing-pager';
import {
  Battle,
  battleResult,
  reasonLabel,
  Round,
  RoundByRoundApiService,
  RoundPlayedView,
  TournamentView,
} from '../round-by-round-api';

/** Runs a Tournament one Round at a time. */
@Component({
  selector: 'app-round-by-round-page',
  imports: [BattleArena, ContenderCard, ListingControls, ListingPager, RouterLink],
  templateUrl: './round-by-round-page.html',
  styleUrl: './round-by-round-page.scss',
})
export class RoundByRoundPage implements OnInit {
  private readonly api = inject(RoundByRoundApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly replays = inject(BATTLE_REPLAY_STEP_MS) !== null;

  protected readonly tournament = signal<TournamentView | null>(null);
  protected readonly currentRound = signal<Round | null>(null);
  protected readonly selectedBattle = signal<Battle | null>(null);
  /** Battles being played out in the arena; the results stay hidden until it finishes. */
  protected readonly replaying = signal<Battle[] | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly notFound = signal(false);
  private retry: () => void = () => this.start();

  /** Processing mid-replay is allowed: the new Round's replay takes over the arena. */
  protected readonly canProcess = computed(
    () => !this.loading() && this.tournament()?.status === 'inProgress',
  );

  /** Every Round of the Tournament, in order, marking which have been played and which is next. */
  protected readonly roundStrip = computed(() => {
    const tournament = this.tournament();
    if (!tournament) return [];
    return Array.from({ length: tournament.totalRounds }, (_, i) => ({
      number: i + 1,
      played: i < tournament.roundsPlayed,
      next: i === tournament.roundsPlayed,
    }));
  });

  /** The number of the Round Process Round will play, or null once every Round is played. */
  protected readonly nextRound = computed(() => {
    const tournament = this.tournament();
    if (!tournament || tournament.status === 'complete') return null;
    return tournament.roundsPlayed + 1;
  });

  protected readonly roundsLeft = computed(() => {
    const tournament = this.tournament();
    return tournament ? tournament.totalRounds - tournament.roundsPlayed : 0;
  });

  private readonly standings = computed(() => this.tournament()?.standings ?? []);
  protected readonly listing = new ContenderListing(this.standings);

  /** Medals wait for the last Round: earlier, half the field would share each one. */
  protected readonly cards = computed(() => {
    const tournament = this.tournament();
    if (!tournament) return [];
    const allWins = tournament.standings.map((c) => c.wins);
    return this.listing.visible().map((contender) => ({
      contender,
      medal: tournament.status === 'complete' ? medalFor(contender.wins, allWins) : null,
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
        this.replaying.set(null);
        this.listing.goToPage(1);
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
        this.replaying.set(null);
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
        this.applyPlayed(played);
        if (this.replays) this.replaying.set(played.round.battles);
      },
    );
  }

  /**
   * Plays every remaining Round, one request at a time, without replays. Standings update after
   * each Round, so a retry after a failure carries on from where it stopped.
   */
  protected processAllRounds(): void {
    const tournament = this.tournament();
    if (!tournament) return;
    const playNext = () =>
      this.api.playNextRound(tournament.id).pipe(tap((p) => this.applyPlayed(p)));
    this.replaying.set(null);
    this.run(
      () => this.processAllRounds(),
      playNext().pipe(
        expand((played) => (played.status === 'inProgress' ? playNext() : EMPTY)),
        last(),
      ),
      () => {},
    );
  }

  private applyPlayed(played: RoundPlayedView): void {
    this.tournament.update(
      (t) =>
        t && {
          ...t,
          standings: played.standings,
          roundsPlayed: played.roundsPlayed,
          status: played.status,
        },
    );
    this.currentRound.set(played.round);
    this.selectedBattle.set(null);
  }

  /** A played Round opens for review; the next Round gets played. */
  protected pickRound(slot: { number: number; played: boolean; next: boolean }): void {
    if (slot.played) this.reviewRound(slot.number);
    else if (slot.next) this.processRound();
  }

  protected reviewRound(roundNumber: number): void {
    const tournament = this.tournament();
    if (!tournament) return;
    this.run(
      () => this.reviewRound(roundNumber),
      this.api.getRound(tournament.id, roundNumber),
      (round) => {
        this.currentRound.set(round);
        this.replaying.set(null);
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

  @HostListener('document:keydown.escape')
  protected closeBattle(): void {
    this.selectedBattle.set(null);
  }

  /** Nothing started, loading or gone wrong yet: the page is a game's title screen. */
  protected readonly titleScreen = computed(
    () => !this.tournament() && !this.loading() && !this.failed() && !this.notFound(),
  );
  /** Bouncing on the title screen: Bulbasaur, Charmander, Squirtle, Pikachu. */
  protected readonly starters = [1, 4, 7, 25];
  protected readonly hud = [
    { value: 16, label: 'Pokémon' },
    { value: 15, label: 'Rounds' },
    { value: 1, label: 'Champion' },
  ];

  protected readonly spriteUrl = spriteUrl;
  protected readonly typeColour = typeColour;

  protected reasonLabel(battle: Battle): string {
    return reasonLabel(battle);
  }

  protected tryAgain(): void {
    this.retry();
  }

  /** Who won and who lost a Battle, or null for a tie. */
  protected result(battle: Battle) {
    return battleResult(battle);
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
