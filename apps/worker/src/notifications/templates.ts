import { NotificationTemplateKey } from './notification.types';

export type TemplateResult = {
  subject: string;
  text: string;
};

export const buildTemplate = (
  template: NotificationTemplateKey,
  data: Record<string, unknown>,
): TemplateResult => {
  switch (template) {
    case 'proposal_received': {
      const protocol = String(data.protocol ?? '');
      const deadlineDays = Number(data.deadlineDays ?? 0);
      return {
        subject: `Recebemos sua proposta ${protocol}`.trim(),
        text: `Recebemos sua proposta ${protocol}. Prazo estimado: ${deadlineDays} dias.`.trim(),
      };
    }
    case 'proposal_pending': {
      const missing = Array.isArray(data.missingItems) ? data.missingItems.join(', ') : '';
      const link = String(data.secureLink ?? '');
      return {
        subject: 'Pendencia na sua proposta',
        text: `Faltam: ${missing}. Envie pelo link: ${link}`.trim(),
      };
    }
    case 'proposal_approved': {
      const link = String(data.signatureLink ?? '');
      return {
        subject: 'Proposta aprovada - assine o contrato',
        text: `Sua proposta foi aprovada. Assine aqui: ${link}`.trim(),
      };
    }
    case 'proposal_rejected': {
      const message = String(data.message ?? '');
      return {
        subject: 'Proposta reprovada',
        text: message || 'Sua proposta foi reprovada.',
      };
    }
    case 'proposal_signed': {
      const memberNumber = String(data.memberNumber ?? '');
      return {
        subject: 'Assinatura concluida',
        text: `Assinatura concluida. Numero associado: ${memberNumber}`.trim(),
      };
    }
    default:
      return { subject: 'Notificacao', text: '' };
  }
};

export const getSendgridTemplateId = (template: NotificationTemplateKey) => {
  switch (template) {
    case 'proposal_received':
      return process.env.SENDGRID_TEMPLATE_PROPOSAL_RECEIVED;
    case 'proposal_pending':
      return process.env.SENDGRID_TEMPLATE_PROPOSAL_PENDING;
    case 'proposal_approved':
      return process.env.SENDGRID_TEMPLATE_PROPOSAL_APPROVED;
    case 'proposal_rejected':
      return process.env.SENDGRID_TEMPLATE_PROPOSAL_REJECTED;
    case 'proposal_signed':
      return process.env.SENDGRID_TEMPLATE_PROPOSAL_SIGNED;
    default:
      return undefined;
  }
};
