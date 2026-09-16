import { environment } from '../../../environments/environment';

export function avatarUrl(userId: number, avatarUpdatedAt: string | null | undefined): string | null {
  if (!avatarUpdatedAt) {
    return null;
  }
  return `${environment.apiUrl}/users/${userId}/avatar?v=${encodeURIComponent(avatarUpdatedAt)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word.length > 1)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
