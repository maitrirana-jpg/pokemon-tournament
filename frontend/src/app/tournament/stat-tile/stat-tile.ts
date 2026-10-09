import { Component, input } from '@angular/core';

/** A labelled count, such as a Contender's wins. */
@Component({
  selector: 'app-stat-tile',
  template: `
    <div class="rounded bg-body-tertiary text-center py-2">
      <div class="small text-body-secondary">{{ label() }}</div>
      <div class="fs-5 fw-bold" [class]="'text-' + tone()">{{ value() }}</div>
    </div>
  `,
})
export class StatTile {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly tone = input.required<'success' | 'danger' | 'primary'>();
}
