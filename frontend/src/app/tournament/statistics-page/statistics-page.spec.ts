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

const names = (...ids: number[]) => ids.map((id) => `pokemon-${id}`);

function control(page: HTMLElement, testId: string): HTMLSelectElement {
  return page.querySelector<HTMLSelectElement>(`[data-testid="${testId}"]`)!;
}

function text(page: HTMLElement, testId: string): string {
  return page.querySelector(`[data-testid="${testId}"]`)!.textContent!.trim();
}

function button(page: HTMLElement, testId: string): HTMLButtonElement {
  return page.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!;
}

function choose(page: HTMLElement, testId: string, value: string): void {
  const select = control(page, testId);
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

function cardNames(page: HTMLElement): string[] {
  return Array.from(page.querySelectorAll('[data-testid="contender-card"] h2'), (h) =>
    h.textContent!.trim(),
  );
}

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

  it('plays a Tournament on open and shows page 1 of 8 Contenders by wins descending', async () => {
    const fixture = TestBed.createComponent(StatisticsPage);
    const page = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    const request = http.expectOne(
      (req) =>
        req.url === '/pokemon/tournament/statistics' &&
        req.params.get('sortBy') === 'wins' &&
        req.params.get('sortDirection') === 'desc',
    );
    request.flush(sixteenRecords);
    await fixture.whenStable();

    expect(control(page, 'sort-field').value).toBe('wins');
    expect(control(page, 'sort-direction').value).toBe('desc');
    expect(control(page, 'page-size').value).toBe('8');
    expect(text(page, 'page-indicator')).toBe('Page 1 of 2');
    expect(cardNames(page)).toEqual(names(1, 2, 3, 4, 5, 6, 7, 8));
  });

  async function openWithResults() {
    const fixture = TestBed.createComponent(StatisticsPage);
    fixture.detectChanges();
    http.expectOne((req) => req.url === '/pokemon/tournament/statistics').flush(sixteenRecords);
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  it('reorders the loaded Contenders when the sort changes, without playing again', async () => {
    const { fixture, page } = await openWithResults();

    choose(page, 'sort-direction', 'asc');
    await fixture.whenStable();

    expect(cardNames(page)).toEqual(names(16, 15, 14, 13, 12, 11, 10, 9));

    choose(page, 'sort-field', 'name');
    await fixture.whenStable();

    expect(cardNames(page)).toEqual(names(1, 10, 11, 12, 13, 14, 15, 16));
    http.expectNone((req) => req.url === '/pokemon/tournament/statistics');
  });

  it('moves between pages with Previous and Next, disabled at either end', async () => {
    const { fixture, page } = await openWithResults();
    const previous = button(page, 'previous');
    const next = button(page, 'next');

    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    next.click();
    await fixture.whenStable();

    expect(text(page, 'page-indicator')).toBe('Page 2 of 2');
    expect(cardNames(page)).toEqual(names(9, 10, 11, 12, 13, 14, 15, 16));
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(true);

    previous.click();
    await fixture.whenStable();

    expect(text(page, 'page-indicator')).toBe('Page 1 of 2');
  });

  it('offers 4, 8 or 16 Contenders per page', async () => {
    const { fixture, page } = await openWithResults();

    const options = Array.from(control(page, 'page-size').options, (o) => o.value);
    expect(options).toEqual(['4', '8', '16']);

    choose(page, 'page-size', '4');
    await fixture.whenStable();

    expect(cardNames(page)).toEqual(names(1, 2, 3, 4));
    expect(text(page, 'page-indicator')).toBe('Page 1 of 4');
  });

  for (const [testId, value] of [
    ['sort-field', 'name'],
    ['sort-direction', 'asc'],
    ['page-size', '4'],
  ]) {
    it(`returns to page 1 when ${testId} changes`, async () => {
      const { fixture, page } = await openWithResults();
      button(page, 'next').click();
      await fixture.whenStable();

      choose(page, testId, value);
      await fixture.whenStable();

      expect(text(page, 'page-indicator')).toMatch(/^Page 1 of/);
    });
  }

  it('plays exactly one new Tournament on "New tournament", keeping the selected sort', async () => {
    const { fixture, page } = await openWithResults();
    choose(page, 'sort-field', 'id');
    choose(page, 'sort-direction', 'asc');
    await fixture.whenStable();

    button(page, 'new-tournament').click();
    const request = http.expectOne((req) => req.url === '/pokemon/tournament/statistics');
    const reversed = sixteenRecords.map((r) => ({ ...r, name: `new-${r.id}` })).reverse();
    request.flush(reversed);
    await fixture.whenStable();

    expect(control(page, 'sort-field').value).toBe('id');
    expect(control(page, 'sort-direction').value).toBe('asc');
    expect(cardNames(page)).toEqual([1, 2, 3, 4, 5, 6, 7, 8].map((id) => `new-${id}`));
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
      expect(page.querySelectorAll('[data-testid="contender-card"]').length).toBe(8);
    });
  }
});
