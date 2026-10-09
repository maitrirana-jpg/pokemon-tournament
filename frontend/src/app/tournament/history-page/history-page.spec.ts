import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HistoryPage } from './history-page';
import { HistoryEntry } from '../round-by-round-api';

const entries: HistoryEntry[] = [
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000002',
    startedAt: '2026-10-09T12:01:00+00:00',
    roundsPlayed: 0,
    totalRounds: 15,
    status: 'inProgress',
    leader: null,
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    startedAt: '2026-10-09T12:00:00+00:00',
    roundsPlayed: 15,
    totalRounds: 15,
    status: 'complete',
    leader: { id: 94, name: 'gengar', wins: 14 },
  },
];

describe('HistoryPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HistoryPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function openWith(history: HistoryEntry[]) {
    const fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();
    http.expectOne('/pokemon/tournament/history').flush(history);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('lists past Tournaments newest first, each linking to its run', async () => {
    const page = await openWith(entries);

    const rows = Array.from(
      page.querySelectorAll<HTMLAnchorElement>('[data-testid="history-entry"]'),
    );
    expect(rows.map((r) => r.getAttribute('href'))).toEqual([
      '/tournament/bbbbbbbb-0000-4000-8000-000000000002',
      '/tournament/aaaaaaaa-0000-4000-8000-000000000001',
    ]);
    const text = rows.map((r) => r.textContent!.replace(/\s+/g, ' '));
    expect(text[0]).toContain('Round 0 of 15');
    expect(text[0]).toContain('In progress');
    expect(text[0]).toContain('No leader yet');
    expect(text[1]).toContain('Round 15 of 15');
    expect(text[1]).toContain('Complete');
    expect(text[1]).toContain('gengar (14 wins)');
  });

  it('says so when no Tournament has been run', async () => {
    const page = await openWith([]);

    expect(page.querySelector('[data-testid="history-empty"]')).not.toBeNull();
    expect(page.querySelectorAll('[data-testid="history-entry"]')).toHaveLength(0);
  });

  it('says so when the history cannot be loaded', async () => {
    const fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();
    http
      .expectOne('/pokemon/tournament/history')
      .flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[data-testid="history-error"]')).not.toBeNull();
  });
});
