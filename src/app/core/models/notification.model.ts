export type NotificationType = 'NEW_FOLLOWER';

export interface Notification {
  id: number;
  type: NotificationType;
  actorId: number;
  actorAlias: string | null;
  actorName: string;
  read: boolean;
  createdAt: string;
}
