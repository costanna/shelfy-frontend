import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

const STARS = [1, 2, 3, 4, 5] as const;
const MIN_RATING = 0.5;
const MAX_RATING = 5;
const STEP = 0.5;

function clampToStep(value: number): number {
  const rounded = Math.round(value / STEP) * STEP;
  return Math.min(MAX_RATING, Math.max(MIN_RATING, rounded));
}

@Component({
  selector: 'app-star-rating',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.scss',
})
export class StarRating {
  readonly rating = input.required<number>();
  readonly editable = input(false);

  readonly ratingChange = output<number>();

  protected readonly stars = STARS;

  private readonly hoverValue = signal<number | null>(null);

  protected readonly displayValue = computed(() => this.hoverValue() ?? this.rating());

  protected readonly label = computed(() => ({ rating: this.displayValue() }));

  protected fillPercent(star: number): number {
    const filled = this.displayValue() - (star - 1);
    return Math.round(Math.min(1, Math.max(0, filled)) * 100);
  }

  protected onHover(star: number, event: MouseEvent): void {
    if (!this.editable()) {
      return;
    }
    this.hoverValue.set(this.valueFromEvent(star, event));
  }

  protected onLeave(): void {
    this.hoverValue.set(null);
  }

  protected onClick(star: number, event: MouseEvent): void {
    if (!this.editable()) {
      return;
    }
    this.ratingChange.emit(this.valueFromEvent(star, event));
  }

  private valueFromEvent(star: number, event: MouseEvent): number {
    const target = event.currentTarget as HTMLElement;
    const { left, width } = target.getBoundingClientRect();
    const isLeftHalf = event.clientX - left < width / 2;
    return clampToStep(isLeftHalf ? star - 0.5 : star);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.editable()) {
      return;
    }
    const current = this.rating();
    let next: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      next = clampToStep(current + STEP);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      next = clampToStep(current - STEP);
    } else if (/^[1-5]$/.test(event.key)) {
      next = Number(event.key);
    }

    if (next !== null) {
      event.preventDefault();
      this.ratingChange.emit(next);
    }
  }
}
