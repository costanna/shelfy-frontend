import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/** Paginación simple: anterior / siguiente con indicador de posición. */
@Component({
  selector: 'app-pagination',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChange = output<number>();

  protected readonly isFirst = computed(() => this.page() <= 0);
  protected readonly isLast = computed(() => this.page() >= this.totalPages() - 1);
  protected readonly label = computed(() => ({
    page: this.page() + 1,
    total: this.totalPages(),
  }));

  protected go(delta: number): void {
    this.pageChange.emit(this.page() + delta);
  }
}
