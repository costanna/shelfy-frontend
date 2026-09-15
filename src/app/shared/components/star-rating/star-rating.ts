import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

const STARS = [1, 2, 3, 4, 5] as const;
const MIN_RATING = 0.5;
const MAX_RATING = 5;
const STEP = 0.5;

/** Redondea al múltiplo de 0.5 más cercano, dentro de [MIN_RATING, MAX_RATING]. */
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

  /** Valor bajo el cursor mientras se pasa por encima (solo en modo editable). */
  private readonly hoverValue = signal<number | null>(null);

  /** Lo que se pinta ahora mismo: la preview del hover si la hay, si no el valor real. */
  protected readonly displayValue = computed(() => this.hoverValue() ?? this.rating());

  protected readonly label = computed(() => ({ rating: this.displayValue() }));

  /** Porcentaje de relleno (0/50/100) de la estrella en esa posición. */
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

  /** Mitad izquierda del glifo = X.5, mitad derecha = X.0. */
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
