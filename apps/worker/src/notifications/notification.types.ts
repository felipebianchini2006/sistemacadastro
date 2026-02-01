export type NotificationTemplateKey =
  | 'proposal_received'
  | 'proposal_pending'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'proposal_signed'
  | 'proposal_concluded'
  | 'signature_reminder_3'
  | 'signature_reminder_6'
  | 'internal_new_proposal'
  | 'internal_docs_received'
  | 'internal_sla_due'
  | 'admin_message';

export type NotificationJobPayload = {
  notificationId: string;
  to: string;
  template: NotificationTemplateKey;
  data: Record<string, unknown>;
  requestId: string;
  optIn?: boolean;
};
