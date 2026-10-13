import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { HistoryEntry, RoundByRoundApiService } from '../round-by-round-api';

/** Lists every round-by-round Tournament run so far, and can clear them all. */
@Component({
  selector: 'app-history-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './history-page.html',
})
export class HistoryPage {
  private readonly api = inject(RoundByRoundApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly failed = signal(false);
  protected readonly clearFailed = signal(false);
  protected readonly clearing = signal(false);
  /** Clearing can't be undone, so the first click only asks to confirm. */
  protected readonly confirmingClear = signal(false);
  protected readonly entries = signal<HistoryEntry[] | undefined>(undefined);

  constructor() {
    this.api
      .history()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.entries.set(list),
        error: () => this.failed.set(true),
      });
  }

  protected clear(): void {
    this.clearFailed.set(false);
    this.clearing.set(true);
    this.api
      .clearHistory()
      .pipe(
        finalize(() => {
          this.clearing.set(false);
          this.confirmingClear.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.entries.set([]),
        error: () => this.clearFailed.set(true),
      });
  }
}
