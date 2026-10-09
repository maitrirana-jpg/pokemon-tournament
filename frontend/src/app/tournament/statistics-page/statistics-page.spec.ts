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
});
