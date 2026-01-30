import sgMail from '@sendgrid/mail';
import { buildTemplate, getSendgridTemplateId } from './templates';
import { NotificationTemplateKey } from './notification.types';

export class EmailService {
  private initialized = false;

  private ensureClient() {
    if (this.initialized) return;
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY not set');
    }
    sgMail.setApiKey(apiKey);
    this.initialized = true;
  }

  async send(input: {
    to: string;
    template: NotificationTemplateKey;
    data: Record<string, unknown>;
  }) {
    this.ensureClient();

    const from = process.env.SENDGRID_FROM ?? 'no-reply@sistemacadastro.local';
    const templateId = getSendgridTemplateId(input.template);

    if (templateId) {
      const [response] = await sgMail.send({
        to: input.to,
        from,
        templateId,
        dynamicTemplateData: input.data,
      });

      return response?.headers?.['x-message-id'] as string | undefined;
    }

    const template = buildTemplate(input.template, input.data);
    const [response] = await sgMail.send({
      to: input.to,
      from,
      subject: template.subject,
      text: template.text,
    });

    return response?.headers?.['x-message-id'] as string | undefined;
  }
}
