import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RoundByRoundPage } from './round-by-round-page';
import { TournamentView } from '../round-by-round-api';

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

function byTestId(page: HTMLElement, testId: string): HTMLElement | null {
  return page.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
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
});
