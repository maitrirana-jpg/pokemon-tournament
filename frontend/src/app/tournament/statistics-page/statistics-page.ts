import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ContenderRecord, SortDirection, SortField } from '../contender-record';
import { sortContenders } from '../sort-contenders';
import { TournamentApi } from '../tournament-api';

@Component({
  selector: 'app-statistics-page',
  templateUrl: './statistics-page.html',
})
export class StatisticsPage implements OnInit {
  private readonly api = inject(TournamentApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly contenders = signal<ContenderRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  protected readonly sortField = signal<SortField>('wins');
  protected readonly sortDirection = signal<SortDirection>('desc');
  protected readonly pageSize = signal(8);
  protected readonly pageNumber = signal(1);

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.contenders().length / this.pageSize())),
  );
  protected readonly visibleContenders = computed(() => {
    const start = (this.pageNumber() - 1) * this.pageSize();
    return sortContenders(this.contenders(), this.sortField(), this.sortDirection()).slice(
      start,
      start + this.pageSize(),
    );
  });

  ngOnInit(): void {
    this.play();
  }

  protected changeSortField(field: string): void {
    this.sortField.set(field as SortField);
    this.pageNumber.set(1);
  }

  protected changeSortDirection(direction: string): void {
    this.sortDirection.set(direction as SortDirection);
    this.pageNumber.set(1);
  }

  protected changePageSize(size: string): void {
    this.pageSize.set(Number(size));
    this.pageNumber.set(1);
  }

  protected play(): void {
    this.failed.set(false);
    this.loading.set(true);
    this.api
      .playTournament('wins', 'desc')
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (records) => this.contenders.set(records),
        error: () => this.failed.set(true),
      });
  }
}
