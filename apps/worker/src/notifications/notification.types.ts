export type NotificationTemplateKey =
  | 'proposal_received'
  | 'proposal_pending'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'proposal_signed';

export type NotificationJobPayload = {
  notificationId: string;
  to: string;
  template: NotificationTemplateKey;
  data: Record<string, unknown>;
  requestId: string;
  optIn?: boolean;
};
