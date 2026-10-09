import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ContenderCard } from '../contender-card/contender-card';
import { medalFor } from '../contender-display';
import { ContenderRecord } from '../contender-record';
import { sortContenders } from '../sort-contenders';
import { SortDirection, SortField, TournamentApiService } from '../tournament-api';

@Component({
  selector: 'app-statistics-page',
  imports: [ContenderCard, RouterLink],
  templateUrl: './statistics-page.html',
  styleUrl: './statistics-page.scss',
})
export class StatisticsPage implements OnInit {
  private readonly api = inject(TournamentApiService);
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
  protected readonly visibleCards = computed(() => {
    const start = (this.pageNumber() - 1) * this.pageSize();
    const allWins = this.contenders().map((c) => c.wins);
    return sortContenders(this.contenders(), this.sortField(), this.sortDirection())
      .slice(start, start + this.pageSize())
      .map((contender) => ({ contender, medal: medalFor(contender.wins, allWins) }));
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
