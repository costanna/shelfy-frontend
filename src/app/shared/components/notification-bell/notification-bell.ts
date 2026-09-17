import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { Notification } from '../../../core/models/notification.model';
import { NotificationService } from '../../../core/services/notification.service';
import { initials } from '../../../core/util/avatar-url';

@Component({
  selector: 'app-notification-bell',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
})
export class NotificationBell {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly open = signal(false);
  protected readonly unreadCount = signal(0);
  protected readonly notifications = signal<Notification[] | null>(null);
  protected readonly initials = initials;

  constructor() {
    this.refreshUnreadCount();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  protected toggle(): void {
    const next = !this.open();
    this.open.set(next);

    if (next) {
      this.notificationService.list().subscribe((page) => this.notifications.set(page.content));

      if (this.unreadCount() > 0) {
        this.notificationService.markAllRead().subscribe(() => this.unreadCount.set(0));
      }
    }
  }

  protected goToProfile(notification: Notification): void {
    this.open.set(false);
    void this.router.navigate(['/people', notification.actorId]);
  }

  private refreshUnreadCount(): void {
    this.notificationService.unreadCount().subscribe((result) => this.unreadCount.set(result.count));
  }
}
