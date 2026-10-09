import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StatisticsPage } from './statistics-page';
import { ContenderRecord } from '../contender-record';

const sixteenRecords: ContenderRecord[] = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  name: `pokemon-${i + 1}`,
  type: 'normal',
  wins: 15 - i,
  losses: i,
  ties: 0,
}));

describe('StatisticsPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StatisticsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('plays a Tournament on open, sorted by wins descending, and shows all 16 Contenders', async () => {
    const fixture = TestBed.createComponent(StatisticsPage);
    fixture.detectChanges();

    const request = http.expectOne(
      (req) =>
        req.url === '/pokemon/tournament/statistics' &&
        req.params.get('sortBy') === 'wins' &&
        req.params.get('sortDirection') === 'desc',
    );
    request.flush(sixteenRecords);
    await fixture.whenStable();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="contender-card"]');
    expect(cards.length).toBe(16);
    expect(cards[0].textContent).toContain('pokemon-1');
  });

  it('shows a loading indicator only while the Tournament is being played', async () => {
    const fixture = TestBed.createComponent(StatisticsPage);
    const page = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(page.querySelector('[data-testid="loading"]')).not.toBeNull();

    http.expectOne((req) => req.url === '/pokemon/tournament/statistics').flush(sixteenRecords);
    await fixture.whenStable();

    expect(page.querySelector('[data-testid="loading"]')).toBeNull();
  });

  for (const status of [502, 504]) {
    it(`shows an error card on a ${status} and plays again on "Try again"`, async () => {
      const fixture = TestBed.createComponent(StatisticsPage);
      const page = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();

      http
        .expectOne((req) => req.url === '/pokemon/tournament/statistics')
        .flush({ error: 'PokéAPI request failed' }, { status, statusText: 'Upstream error' });
      await fixture.whenStable();

      const errorCard = page.querySelector('[data-testid="error-card"]');
      expect(errorCard).not.toBeNull();
      expect(page.querySelectorAll('[data-testid="contender-card"]').length).toBe(0);

      errorCard!.querySelector<HTMLButtonElement>('button')!.click();
      http.expectOne((req) => req.url === '/pokemon/tournament/statistics').flush(sixteenRecords);
      await fixture.whenStable();

      expect(page.querySelector('[data-testid="error-card"]')).toBeNull();
      expect(page.querySelectorAll('[data-testid="contender-card"]').length).toBe(16);
    });
  }
});
