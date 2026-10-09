import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, catchError } from 'rxjs';
import { RoundByRoundApiService } from '../round-by-round-api';

/** Lists every round-by-round Tournament run so far. */
@Component({
  selector: 'app-history-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './history-page.html',
})
export class HistoryPage {
  protected readonly failed = signal(false);
  protected readonly entries = toSignal(
    inject(RoundByRoundApiService)
      .history()
      .pipe(
        catchError(() => {
          this.failed.set(true);
          return EMPTY;
        }),
      ),
  );
}
