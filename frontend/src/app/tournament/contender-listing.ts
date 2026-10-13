import { Signal, computed, signal } from '@angular/core';
import { ContenderRecord } from './contender-record';
import { sortContenders } from './sort-contenders';
import { SortDirection, SortField } from './tournament-api';

/**
 * How a page lists its Contenders: sorted, then cut into pages. Changing the sort or the page
 * size goes back to page 1; new Contenders keep the current choices.
 */
export class ContenderListing {
  readonly sortField = signal<SortField>('wins');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly pageSize = signal(8);
  private readonly requestedPage = signal(1);

  readonly pageCount: Signal<number>;
  /** The page shown: the one asked for, or the last page if there are now fewer. */
  readonly pageNumber: Signal<number>;
  /** The Contenders on the current page, in sort order. */
  readonly visible: Signal<ContenderRecord[]>;

  constructor(contenders: Signal<readonly ContenderRecord[]>) {
    this.pageCount = computed(() => Math.max(1, Math.ceil(contenders().length / this.pageSize())));
    this.pageNumber = computed(() => Math.min(this.requestedPage(), this.pageCount()));
    this.visible = computed(() => {
      const start = (this.pageNumber() - 1) * this.pageSize();
      return sortContenders(contenders(), this.sortField(), this.sortDirection()).slice(
        start,
        start + this.pageSize(),
      );
    });
  }

  changeSortField(field: string): void {
    this.sortField.set(field as SortField);
    this.goToPage(1);
  }

  changeSortDirection(direction: string): void {
    this.sortDirection.set(direction as SortDirection);
    this.goToPage(1);
  }

  changePageSize(size: string): void {
    this.pageSize.set(Number(size));
    this.goToPage(1);
  }

  goToPage(page: number): void {
    this.requestedPage.set(page);
  }
}
