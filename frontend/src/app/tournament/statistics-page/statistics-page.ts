import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ContenderCard } from '../contender-card/contender-card';
import { medalFor } from '../contender-display';
import { ContenderListing } from '../contender-listing';
import { ContenderRecord } from '../contender-record';
import { ListingControls } from '../listing-controls/listing-controls';
import { ListingPager } from '../listing-pager/listing-pager';
import { TournamentApiService } from '../tournament-api';

@Component({
  selector: 'app-statistics-page',
  imports: [ContenderCard, ListingControls, ListingPager, RouterLink],
  templateUrl: './statistics-page.html',
  styleUrl: './statistics-page.scss',
})
export class StatisticsPage implements OnInit {
  private readonly api = inject(TournamentApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly contenders = signal<ContenderRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  protected readonly listing = new ContenderListing(this.contenders);
  protected readonly visibleCards = computed(() => {
    const allWins = this.contenders().map((c) => c.wins);
    return this.listing
      .visible()
      .map((contender) => ({ contender, medal: medalFor(contender.wins, allWins) }));
  });

  ngOnInit(): void {
    this.play();
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
