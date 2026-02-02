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
  | 'internal_candidate_signed'
  | 'internal_sla_due'
  | 'admin_message';

export type NotificationChannelType = 'EMAIL' | 'SMS' | 'WHATSAPP';

export type NotificationTemplateData =
  | {
      template: 'proposal_received';
      protocol: string;
      deadlineDays: number;
    }
  | {
      template: 'proposal_pending';
      missingItems: string[];
      secureLink: string;
    }
  | {
      template: 'proposal_approved';
      signatureLink: string;
    }
  | {
      template: 'proposal_rejected';
      message: string;
    }
  | {
      template: 'proposal_signed';
      memberNumber: string;
    }
  | {
      template: 'proposal_concluded';
      memberNumber: string;
    }
  | {
      template: 'signature_reminder_3';
      signatureLink: string;
    }
  | {
      template: 'signature_reminder_6';
      signatureLink: string;
    }
  | {
      template: 'internal_new_proposal';
      protocol: string;
      name: string;
    }
  | {
      template: 'internal_docs_received';
      protocol: string;
      name: string;
    }
  | {
      template: 'internal_candidate_signed';
      protocol: string;
      name: string;
    }
  | {
      template: 'internal_sla_due';
      protocol: string;
      name: string;
    }
  | {
      template: 'admin_message';
      subject?: string;
      message: string;
    };

export type NotificationJobPayload = {
  notificationId: string;
  channel: NotificationChannelType;
  to: string;
  template: NotificationTemplateKey;
  data: Record<string, unknown>;
  requestId: string;
  optIn?: boolean;
};
