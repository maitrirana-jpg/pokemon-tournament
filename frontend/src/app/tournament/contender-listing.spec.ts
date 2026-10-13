import { signal } from '@angular/core';
import { ContenderListing } from './contender-listing';
import { ContenderRecord } from './contender-record';

const contender = (id: number, wins: number): ContenderRecord => ({
  id,
  name: `pokemon-${id}`,
  type: 'normal',
  wins,
  losses: 0,
  ties: 0,
});

describe('ContenderListing', () => {
  const ten = Array.from({ length: 10 }, (_, i) => contender(i + 1, i));

  it('starts on Wins descending, 8 per page, page 1', () => {
    const listing = new ContenderListing(signal(ten));

    expect(listing.visible().map((c) => c.id)).toEqual([10, 9, 8, 7, 6, 5, 4, 3]);
    expect(listing.pageCount()).toBe(2);
    expect(listing.pageNumber()).toBe(1);
  });

  it('goes back to page 1 when the sort or page size changes', () => {
    const listing = new ContenderListing(signal(ten));

    listing.goToPage(2);
    listing.changeSortDirection('asc');
    expect(listing.pageNumber()).toBe(1);

    listing.goToPage(2);
    listing.changePageSize('4');
    expect(listing.pageNumber()).toBe(1);

    listing.goToPage(2);
    listing.changeSortField('name');
    expect(listing.pageNumber()).toBe(1);
  });

  it('keeps the page when the Contenders change, but never past the last page', () => {
    const contenders = signal(ten);
    const listing = new ContenderListing(contenders);

    listing.goToPage(2);
    contenders.set(ten.map((c) => ({ ...c, wins: c.wins + 1 })));
    expect(listing.pageNumber()).toBe(2);

    contenders.set(ten.slice(0, 3));
    expect(listing.pageNumber()).toBe(1);
    expect(listing.visible()).toHaveLength(3);
  });
});
