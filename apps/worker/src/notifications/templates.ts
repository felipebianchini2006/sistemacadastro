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
    case 'proposal_concluded': {
      const memberNumber = String(data.memberNumber ?? '');
      return {
        subject: 'Bem-vindo(a) a SBACEM!',
        text: `Sua filiacao foi concluida com sucesso. Numero de associado: ${memberNumber}`.trim(),
      };
    }
    case 'signature_reminder_3': {
      const link = String(data.signatureLink ?? '');
      return {
        subject: 'Lembrete: assinatura pendente',
        text: `Voce ainda nao assinou sua proposta. Assine aqui: ${link}`.trim(),
      };
    }
    case 'signature_reminder_6': {
      const link = String(data.signatureLink ?? '');
      return {
        subject: 'Lembrete final: assinatura pendente',
        text: `Seu link de assinatura expira em breve. Assine aqui: ${link}`.trim(),
      };
    }
    case 'internal_new_proposal': {
      const protocol = String(data.protocol ?? '');
      const name = String(data.name ?? '');
      return {
        subject: `Nova proposta recebida ${protocol}`.trim(),
        text: `Nova proposta recebida. Protocolo: ${protocol}. Nome: ${name}`.trim(),
      };
    }
    case 'internal_docs_received': {
      const protocol = String(data.protocol ?? '');
      const name = String(data.name ?? '');
      return {
        subject: `Documentos recebidos ${protocol}`.trim(),
        text: `Candidato enviou documentos complementares. Protocolo: ${protocol}. Nome: ${name}`.trim(),
      };
    }
    case 'internal_sla_due': {
      const protocol = String(data.protocol ?? '');
      const name = String(data.name ?? '');
      return {
        subject: `SLA proximo de vencer ${protocol}`.trim(),
        text: `SLA proximo do vencimento. Protocolo: ${protocol}. Nome: ${name}`.trim(),
      };
    }
    case 'admin_message': {
      const subject = String(data.subject ?? 'Mensagem da equipe SBACEM');
      const message = String(data.message ?? '');
      return {
        subject,
        text: message,
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
    case 'proposal_concluded':
      return process.env.SENDGRID_TEMPLATE_PROPOSAL_CONCLUDED;
    case 'signature_reminder_3':
      return process.env.SENDGRID_TEMPLATE_SIGNATURE_REMINDER_3;
    case 'signature_reminder_6':
      return process.env.SENDGRID_TEMPLATE_SIGNATURE_REMINDER_6;
    case 'internal_new_proposal':
      return process.env.SENDGRID_TEMPLATE_INTERNAL_NEW_PROPOSAL;
    case 'internal_docs_received':
      return process.env.SENDGRID_TEMPLATE_INTERNAL_DOCS_RECEIVED;
    case 'internal_sla_due':
      return process.env.SENDGRID_TEMPLATE_INTERNAL_SLA_DUE;
    case 'admin_message':
      return process.env.SENDGRID_TEMPLATE_ADMIN_MESSAGE;
    default:
      return undefined;
  }
};
