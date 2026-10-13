import {
  Component,
  DestroyRef,
  InjectionToken,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { spriteUrl, typeColour } from '../contender-display';
import { Battle, BattleContender, battleResult, reasonLabel } from '../round-by-round-api';

/**
 * How long one beat of a Battle replay lasts, in milliseconds; null turns replays off.
 * A Battle takes four beats: the Contenders enter, clash, then the result holds for two.
 */
export const BATTLE_REPLAY_STEP_MS = new InjectionToken<number | null>('BATTLE_REPLAY_STEP_MS', {
  providedIn: 'root',
  factory: () => 450,
});

type Phase = 'enter' | 'clash' | 'result';

const beats: Record<Phase, number> = { enter: 1, clash: 1, result: 2 };
const nextPhase: Record<Phase, Phase | null> = { enter: 'clash', clash: 'result', result: null };

/** Plays Battles one after another as a face-off, then reports that it has finished. */
@Component({
  selector: 'app-battle-arena',
  templateUrl: './battle-arena.html',
  styleUrl: './battle-arena.scss',
})
export class BattleArena {
  readonly battles = input.required<Battle[]>();
  readonly finished = output<void>();

  private readonly stepMs = inject(BATTLE_REPLAY_STEP_MS) ?? 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly index = signal(0);
  protected readonly phase = signal<Phase>('enter');
  protected readonly battle = computed(() => this.battles()[this.index()]);
  protected readonly result = computed(() =>
    this.phase() === 'result' ? battleResult(this.battle()) : null,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    // New Battles (the next Round played mid-replay) restart the replay from the top.
    effect(() => {
      this.battles();
      untracked(() => this.restart());
    });
  }

  private restart(): void {
    clearTimeout(this.timer);
    this.index.set(0);
    this.phase.set('enter');
    this.scheduleNextBeat();
  }

  protected skip(): void {
    clearTimeout(this.timer);
    this.finished.emit();
  }

  /** How a Contender comes out of the Battle, once the result is shown. */
  protected outcomeFor(contender: BattleContender): 'winner' | 'loser' | 'tie' | null {
    if (this.phase() !== 'result') return null;
    const result = this.result();
    if (!result) return 'tie';
    return result.winner.id === contender.id ? 'winner' : 'loser';
  }

  protected readonly spriteUrl = spriteUrl;
  protected readonly typeColour = typeColour;
  protected readonly reasonLabel = reasonLabel;

  private scheduleNextBeat(): void {
    this.timer = setTimeout(() => this.advance(), beats[this.phase()] * this.stepMs);
  }

  private advance(): void {
    const next = nextPhase[this.phase()];
    if (next) {
      this.phase.set(next);
    } else if (this.index() + 1 < this.battles().length) {
      this.index.update((i) => i + 1);
      this.phase.set('enter');
    } else {
      this.finished.emit();
      return;
    }
    this.scheduleNextBeat();
  }
}
