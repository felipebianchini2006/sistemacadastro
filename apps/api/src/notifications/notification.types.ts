export type NotificationTemplateKey =
  | 'proposal_received'
  | 'proposal_pending'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'proposal_signed';

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
