import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Category } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { Spinner } from '../../../shared/components/spinner/spinner';

@Component({
  selector: 'app-category-list-page',
  imports: [ReactiveFormsModule, TranslatePipe, EmptyState, FieldError, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-list.page.html',
  styleUrl: './category-list.page.scss',
})
export class CategoryListPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly seedingDefaults = signal(false);

  protected readonly editingId = signal<number | null>(null);

  protected readonly createForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
  });

  protected readonly editForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
  });

  constructor() {
    this.load();
  }

  protected create(): void {
    if (this.createForm.invalid || this.saving()) {
      return;
    }
    this.saving.set(true);

    this.categoryService.create(this.createForm.getRawValue()).subscribe({
      next: () => {
        this.createForm.reset();
        this.saving.set(false);
        this.toast.success('categories.created');
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  protected startEdit(category: Category): void {
    this.editingId.set(category.id);
    this.editForm.setValue({ name: category.name });
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected saveEdit(id: number): void {
    if (this.editForm.invalid || this.saving()) {
      return;
    }
    this.saving.set(true);

    this.categoryService.update(id, this.editForm.getRawValue()).subscribe({
      next: () => {
        this.editingId.set(null);
        this.saving.set(false);
        this.toast.success('categories.updated');
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  protected remove(category: Category): void {
    const message = this.translate.instant('categories.deleteConfirm', { name: category.name });
    if (!confirm(message)) {
      return;
    }

    this.categoryService.delete(category.id).subscribe({
      next: () => {
        this.toast.success('categories.deleted');
        this.load();
      },
    });
  }

  protected seedDefaults(): void {
    if (this.seedingDefaults()) {
      return;
    }
    this.seedingDefaults.set(true);

    this.categoryService.seedDefaults().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.seedingDefaults.set(false);
        this.toast.success('categories.defaultsAdded');
      },
      error: () => this.seedingDefaults.set(false),
    });
  }

  private load(): void {
    this.loading.set(true);

    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
