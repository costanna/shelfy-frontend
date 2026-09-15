import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

const STARS = [1, 2, 3, 4, 5] as const;

/**
 * Muestra una puntuación de 1 a 5. Con [editable]="true" permite elegirla
 * con el ratón o con el teclado (flechas y números).
 */
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
  protected readonly label = computed(() => ({ rating: this.rating() }));

  protected select(value: number): void {
    if (this.editable()) {
      this.ratingChange.emit(value);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.editable()) {
      return;
    }
    const current = this.rating();
    let next: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      next = Math.min(5, current + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      next = Math.max(1, current - 1);
    } else if (/^[1-5]$/.test(event.key)) {
      next = Number(event.key);
    }

    if (next !== null) {
      event.preventDefault();
      this.ratingChange.emit(next);
    }
  }
}
