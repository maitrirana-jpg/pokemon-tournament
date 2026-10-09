import { Component, computed, input } from '@angular/core';
import { ContenderRecord } from '../contender-record';
import { Medal, paddedId, spriteUrl, typeColour, winRate } from '../contender-display';
import { StatTile } from '../stat-tile/stat-tile';

/** One Contender's Record, as a card. */
@Component({
  selector: 'app-contender-card',
  imports: [StatTile],
  templateUrl: './contender-card.html',
  styleUrl: './contender-card.scss',
})
export class ContenderCard {
  readonly contender = input.required<ContenderRecord>();
  readonly medal = input<Medal | null>(null);

  protected readonly typeColour = computed(() => typeColour(this.contender().type));
  protected readonly paddedId = computed(() => paddedId(this.contender().id));
  protected readonly spriteUrl = computed(() => spriteUrl(this.contender().id));
  protected readonly winRate = computed(() => winRate(this.contender()));
}
