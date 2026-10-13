import { Component, input } from '@angular/core';
import { ContenderListing } from '../contender-listing';

/**
 * Sort and page-size pickers for a Contender listing, as one compact toolbar. An optional heading
 * sits on the left; extra buttons can be projected at the end.
 */
@Component({
  selector: 'app-listing-controls',
  templateUrl: './listing-controls.html',
  styleUrl: './listing-controls.scss',
})
export class ListingControls {
  readonly listing = input.required<ContenderListing>();
  readonly heading = input<string>();
}
