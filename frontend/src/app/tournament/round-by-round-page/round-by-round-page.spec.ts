import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RoundByRoundPage } from './round-by-round-page';
import { Battle, RoundPlayedView, TournamentView } from '../round-by-round-api';

const startedTournament: TournamentView = {
  id: '3f2a6c1e-0000-4000-8000-000000000001',
  startedAt: '2026-10-09T12:00:00+00:00',
  roundsPlayed: 0,
  totalRounds: 15,
  status: 'inProgress',
  standings: Array.from({ length: 16 }, (_, i) => ({
    id: i + 1,
    name: `pokemon-${i + 1}`,
    type: 'normal',
    wins: 0,
    losses: 0,
    ties: 0,
  })),
};

function byTestId<T extends HTMLElement = HTMLElement>(
  page: HTMLElement,
  testId: string,
): T | null {
  return page.querySelector<T>(`[data-testid="${testId}"]`);
}

function allByTestId(page: HTMLElement, testId: string): HTMLElement[] {
  return Array.from(page.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`));
}

describe('RoundByRoundPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RoundByRoundPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function open() {
    const fixture = TestBed.createComponent(RoundByRoundPage);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  it('starts a Tournament and shows all 16 Contenders even at Round 0 of 15', async () => {
    const { fixture, page } = await open();
    expect(allByTestId(page, 'contender-card')).toHaveLength(0);

    byTestId(page, 'start')!.click();
    fixture.detectChanges();
    expect(byTestId(page, 'loading')).not.toBeNull();

    const request = http.expectOne('/pokemon/tournament');
    expect(request.request.method).toBe('POST');
    request.flush(startedTournament);
    await fixture.whenStable();

    expect(byTestId(page, 'loading')).toBeNull();
    expect(byTestId(page, 'round-counter')!.textContent!.trim()).toBe('Round 0 of 15');
    const cards = allByTestId(page, 'contender-card');
    expect(cards).toHaveLength(16);
    expect(allByTestId(page, 'win-rate').map((rate) => rate.textContent!.trim())).toEqual(
      Array(16).fill('0%'),
    );
    expect(allByTestId(page, 'medal')).toHaveLength(0);
  });

  it('shows an error card when PokéAPI fails, and Try again starts a Tournament', async () => {
    const { fixture, page } = await open();

    byTestId(page, 'start')!.click();
    http
      .expectOne('/pokemon/tournament')
      .flush({ error: 'PokéAPI request failed' }, { status: 502, statusText: 'Bad Gateway' });
    await fixture.whenStable();

    const errorCard = byTestId(page, 'error-card')!;
    expect(errorCard).not.toBeNull();
    expect(allByTestId(page, 'contender-card')).toHaveLength(0);

    errorCard.querySelector('button')!.click();
    http.expectOne('/pokemon/tournament').flush(startedTournament);
    await fixture.whenStable();

    expect(byTestId(page, 'error-card')).toBeNull();
    expect(allByTestId(page, 'contender-card')).toHaveLength(16);
  });

  it('offers the Classic view at the bottom of the page', async () => {
    const { page } = await open();

    expect(byTestId(page, 'classic-view')!.getAttribute('href')).toBe('/classic');
  });

  const contender = (id: number) => ({
    id,
    name: `pokemon-${id}`,
    type: 'normal',
    baseExperience: 100,
  });

  /** Round 1: the lower id wins each pair, except 8 vs 9, which ties. */
  function roundOne(): RoundPlayedView {
    const battles: Battle[] = Array.from({ length: 8 }, (_, i) => {
      const [first, second] = [i + 1, 16 - i];
      const tie = first === 8;
      return {
        id: i + 1,
        round: 1,
        first: contender(first),
        second: contender(second),
        outcome: tie ? 'tie' : 'firstWins',
        winnerId: tie ? null : first,
        reason: tie ? 'equalBaseExperience' : 'baseExperience',
      };
    });
    const standings = startedTournament.standings.map((c) => ({
      ...c,
      wins: c.id < 8 ? 1 : 0,
      losses: c.id > 9 ? 1 : 0,
      ties: c.id === 8 || c.id === 9 ? 1 : 0,
    }));
    return {
      round: { number: 1, battles },
      standings,
      roundsPlayed: 1,
      status: 'inProgress',
    };
  }

  async function openStarted() {
    const opened = await open();
    byTestId(opened.page, 'start')!.click();
    http.expectOne('/pokemon/tournament').flush(startedTournament);
    await opened.fixture.whenStable();
    return opened;
  }

  it('processes a Round and reveals its 8 Battles with updated standings', async () => {
    const { fixture, page } = await openStarted();

    byTestId(page, 'process')!.click();
    fixture.detectChanges();
    expect(byTestId<HTMLButtonElement>(page, 'process')!.disabled).toBe(true);

    const request = http.expectOne(`/pokemon/tournament/${startedTournament.id}/rounds`);
    expect(request.request.method).toBe('POST');
    request.flush(roundOne());
    await fixture.whenStable();

    expect(byTestId(page, 'round-counter')!.textContent!.trim()).toBe('Round 1 of 15');
    const battles = allByTestId(page, 'battle').map((b) =>
      b.textContent!.replace(/\s+/g, ' ').trim(),
    );
    expect(battles).toHaveLength(8);
    expect(battles[0]).toContain('pokemon-1 vs pokemon-16');
    expect(battles[0]).toContain('pokemon-1 wins');
    expect(battles[7]).toContain('pokemon-8 vs pokemon-9');
    expect(battles[7]).toContain('Tie');
    expect(allByTestId(page, 'win-rate')[0].textContent!.trim()).toBe('100%');
    // 1–7 share rank 1 with a win each; everyone else shares rank 8.
    const medals = allByTestId(page, 'medal').map((m) => m.textContent!.trim());
    expect(medals).toEqual([...Array(7).fill('🏆'), ...Array(9).fill('🥉')]);
    expect(byTestId<HTMLButtonElement>(page, 'process')!.disabled).toBe(false);
  });

  it('stops offering Process Round once the Tournament is complete', async () => {
    const { fixture, page } = await openStarted();

    byTestId(page, 'process')!.click();
    http
      .expectOne(`/pokemon/tournament/${startedTournament.id}/rounds`)
      .flush({ ...roundOne(), roundsPlayed: 15, status: 'complete' });
    await fixture.whenStable();

    expect(byTestId<HTMLButtonElement>(page, 'process')!.disabled).toBe(true);
    expect(byTestId(page, 'round-counter')!.textContent!.trim()).toBe('Round 15 of 15');
  });

  it('shows an error card when a Round fails, and Try again plays it', async () => {
    const { fixture, page } = await openStarted();

    byTestId(page, 'process')!.click();
    http
      .expectOne(`/pokemon/tournament/${startedTournament.id}/rounds`)
      .flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    byTestId(page, 'error-card')!.querySelector('button')!.click();
    http.expectOne(`/pokemon/tournament/${startedTournament.id}/rounds`).flush(roundOne());
    await fixture.whenStable();

    expect(byTestId(page, 'error-card')).toBeNull();
    expect(allByTestId(page, 'battle')).toHaveLength(8);
  });

  async function openAfterTwoRounds() {
    const opened = await openStarted();
    const roundsUrl = `/pokemon/tournament/${startedTournament.id}/rounds`;
    byTestId(opened.page, 'process')!.click();
    http.expectOne(roundsUrl).flush(roundOne());
    await opened.fixture.whenStable();
    byTestId(opened.page, 'process')!.click();
    const two = roundOne();
    http.expectOne(roundsUrl).flush({
      ...two,
      round: {
        number: 2,
        battles: two.round.battles.map((b) => ({ ...b, id: b.id + 8, round: 2 })),
      },
      roundsPlayed: 2,
    });
    await opened.fixture.whenStable();
    return opened;
  }

  function roundStrip(page: HTMLElement) {
    const picks = allByTestId(page, 'round-pick') as HTMLButtonElement[];
    return {
      numbers: picks.map((p) => p.textContent!.trim()),
      played: picks.filter((p) => !p.disabled).map((p) => p.textContent!.trim()),
      current: picks
        .filter((p) => p.getAttribute('aria-current') === 'true')
        .map((p) => p.textContent!.trim()),
      left: byTestId(page, 'rounds-left')!.textContent!.trim(),
    };
  }

  it('shows all 15 Rounds as left to play right after Start', async () => {
    const { page } = await openStarted();

    const strip = roundStrip(page);
    expect(strip.numbers).toEqual(Array.from({ length: 15 }, (_, i) => `${i + 1}`));
    expect(strip.played).toEqual([]);
    expect(strip.left).toBe('15 Rounds left');
  });

  it('shows every Round number, with played ones open and the newest selected', async () => {
    const { page } = await openAfterTwoRounds();

    const strip = roundStrip(page);
    expect(strip.numbers).toHaveLength(15);
    expect(strip.played).toEqual(['1', '2']);
    expect(strip.current).toEqual(['2']);
    expect(strip.left).toBe('13 Rounds left');
  });

  it('lets the user pick any played Round to review its Battles', async () => {
    const { fixture, page } = await openAfterTwoRounds();

    const picks = allByTestId(page, 'round-pick');
    picks[0].click();
    http.expectOne(`/pokemon/tournament/${startedTournament.id}/rounds/1`).flush(roundOne().round);
    await fixture.whenStable();

    expect(byTestId(page, 'round')!.querySelector('h2')!.textContent!.trim()).toBe('Round 1');
    expect(allByTestId(page, 'battle')).toHaveLength(8);
  });

  it('shows a Battle in detail, with the reason it was decided', async () => {
    const { fixture, page } = await openAfterTwoRounds();

    allByTestId(page, 'battle')[0].click();
    const battle = { ...roundOne().round.battles[0], id: 9, round: 2, reason: 'typeAdvantage' };
    http.expectOne(`/pokemon/tournament/${startedTournament.id}/battles/9`).flush(battle);
    await fixture.whenStable();

    const detail = byTestId(page, 'battle-detail')!.textContent!.replace(/\s+/g, ' ');
    expect(detail).toContain('Battle 9 · Round 2');
    expect(detail).toContain('pokemon-1');
    expect(detail).toContain('pokemon-16');
    expect(detail).toContain('Base experience 100');
    expect(detail).toContain('pokemon-1 wins');
    expect(detail).toContain('Type advantage');
  });

  it('links to the history of past Tournaments', async () => {
    const { page } = await open();

    expect(byTestId(page, 'history')!.getAttribute('href')).toBe('/history');
  });

  async function openAt(url: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'tournament/:id', component: RoundByRoundPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, RoundByRoundPage);
    return harness;
  }

  it('resumes a stored Tournament and lets Process Round continue it', async () => {
    const harness = await openAt(`/tournament/${startedTournament.id}`);
    http
      .expectOne(`/pokemon/tournament/${startedTournament.id}`)
      .flush({ ...startedTournament, roundsPlayed: 1 });
    // The newest Round played is shown straight away.
    http.expectOne(`/pokemon/tournament/${startedTournament.id}/rounds/1`).flush(roundOne().round);
    harness.detectChanges();
    await harness.fixture.whenStable();
    const page = harness.routeNativeElement!;

    expect(byTestId(page, 'round-counter')!.textContent!.trim()).toBe('Round 1 of 15');
    expect(allByTestId(page, 'contender-card')).toHaveLength(16);
    expect(byTestId(page, 'round')!.querySelector('h2')!.textContent!.trim()).toBe('Round 1');
    expect(allByTestId(page, 'battle')).toHaveLength(8);
    expect(byTestId<HTMLButtonElement>(page, 'process')!.disabled).toBe(false);

    byTestId(page, 'process')!.click();
    http.expectOne(`/pokemon/tournament/${startedTournament.id}/rounds`).flush({
      ...roundOne(),
      round: { ...roundOne().round, number: 2 },
      roundsPlayed: 2,
    });
    await harness.fixture.whenStable();

    expect(byTestId(page, 'round-counter')!.textContent!.trim()).toBe('Round 2 of 15');
  });

  it('says so when the Tournament to resume does not exist', async () => {
    const harness = await openAt('/tournament/unknown-id');
    http
      .expectOne('/pokemon/tournament/unknown-id')
      .flush({ error: 'tournament not found' }, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    await harness.fixture.whenStable();
    const page = harness.routeNativeElement!;

    expect(byTestId(page, 'not-found')).not.toBeNull();
    expect(byTestId(page, 'error-card')).toBeNull();
  });

  it('treats a missing Round as an error, not as a missing Tournament', async () => {
    const { fixture, page } = await openAfterTwoRounds();

    allByTestId(page, 'round-pick')[0].click();
    http
      .expectOne(`/pokemon/tournament/${startedTournament.id}/rounds/1`)
      .flush({ error: 'round not found' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(byTestId(page, 'not-found')).toBeNull();
    expect(byTestId(page, 'error-card')).not.toBeNull();
  });

  it('still shows a resumed Tournament when its newest Round cannot be loaded', async () => {
    const harness = await openAt(`/tournament/${startedTournament.id}`);
    http
      .expectOne(`/pokemon/tournament/${startedTournament.id}`)
      .flush({ ...startedTournament, roundsPlayed: 1 });
    http
      .expectOne(`/pokemon/tournament/${startedTournament.id}/rounds/1`)
      .flush({ error: 'round not found' }, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    await harness.fixture.whenStable();
    const page = harness.routeNativeElement!;

    expect(byTestId(page, 'not-found')).toBeNull();
    expect(byTestId(page, 'round-counter')!.textContent!.trim()).toBe('Round 1 of 15');
    expect(allByTestId(page, 'contender-card')).toHaveLength(16);
  });
});
