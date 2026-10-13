import { Component, input } from '@angular/core';
import { ContenderListing } from '../contender-listing';

/** Previous / Next through the pages of a Contender listing. */
@Component({
  selector: 'app-listing-pager',
  template: `
    @let l = listing();
    <nav class="d-flex justify-content-center align-items-center gap-3 mt-4" aria-label="Pages">
      <button
        type="button"
        class="btn btn-outline-secondary"
        data-testid="previous"
        [disabled]="l.pageNumber() === 1"
        (click)="l.goToPage(l.pageNumber() - 1)"
      >
        Previous
      </button>
      <span data-testid="page-indicator">Page {{ l.pageNumber() }} of {{ l.pageCount() }}</span>
      <button
        type="button"
        class="btn btn-outline-secondary"
        data-testid="next"
        [disabled]="l.pageNumber() === l.pageCount()"
        (click)="l.goToPage(l.pageNumber() + 1)"
      >
        Next
      </button>
    </nav>
  `,
})
export class ListingPager {
  readonly listing = input.required<ContenderListing>();
}
