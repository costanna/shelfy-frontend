import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import type { BookFilterValue } from '../../../features/books/book-filters/book-filters';
import { FilterPresetsService } from '../../../core/services/filter-presets.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-filter-presets',
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-presets.html',
  styleUrl: './filter-presets.scss',
})
export class FilterPresets {
  private readonly presetsService = inject(FilterPresetsService);
  private readonly toast = inject(ToastService);

  readonly current = input.required<BookFilterValue>();

  readonly apply = output<BookFilterValue>();

  protected readonly presets = this.presetsService.presets;
  protected readonly naming = signal(false);
  protected readonly nameInput = signal('');

  protected startNaming(): void {
    this.nameInput.set('');
    this.naming.set(true);
  }

  protected cancelNaming(): void {
    this.naming.set(false);
  }

  protected save(): void {
    const name = this.nameInput().trim();
    if (!name) {
      return;
    }
    this.presetsService.save(name, this.current());
    this.naming.set(false);
    this.toast.success('dashboard.presetSaved');
  }

  protected remove(name: string): void {
    this.presetsService.remove(name);
    this.toast.success('dashboard.presetDeleted');
  }
}
