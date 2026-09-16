import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BookNote } from '../../../../core/models/note.model';
import { NoteService } from '../../../../core/services/note.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-note-section',
  imports: [DatePipe, TranslatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './note-section.html',
  styleUrl: './note-section.scss',
})
export class NoteSection {
  private readonly noteService = inject(NoteService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly formBuilder = inject(FormBuilder);

  readonly bookId = input.required<number>();

  protected readonly notes = signal<BookNote[]>([]);
  protected readonly formOpen = signal(false);
  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(2000)]],
    pageReference: [null as number | null, [Validators.min(1)]],
  });

  constructor() {
    effect(() => this.load(this.bookId()));
  }

  protected openForm(): void {
    this.form.reset({ content: '', pageReference: null });
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      return;
    }
    this.saving.set(true);

    const value = this.form.getRawValue();
    this.noteService
      .create(this.bookId(), { content: value.content.trim(), pageReference: value.pageReference })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.formOpen.set(false);
          this.toast.success('notes.created');
          this.load(this.bookId());
        },
        error: () => this.saving.set(false),
      });
  }

  protected remove(note: BookNote): void {
    if (!confirm(this.translate.instant('notes.deleteConfirm'))) {
      return;
    }
    this.noteService.delete(this.bookId(), note.id).subscribe({
      next: () => {
        this.toast.success('notes.deleted');
        this.load(this.bookId());
      },
    });
  }

  private load(bookId: number): void {
    this.noteService.list(bookId).subscribe({
      next: (notes) => this.notes.set(notes),
    });
  }
}
