import twilio from 'twilio';
import { buildTemplate } from './templates';
import { NotificationTemplateKey } from './notification.types';

export class WhatsappService {
  private client?: ReturnType<typeof twilio>;

  private getClient() {
    if (!this.client) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) {
        throw new Error('TWILIO credentials not set');
      }
      this.client = twilio(accountSid, authToken);
    }

    return this.client;
  }

  async send(input: {
    to: string;
    template: NotificationTemplateKey;
    data: Record<string, unknown>;
    optIn?: boolean;
  }) {
    const requireOptIn = process.env.WHATSAPP_REQUIRE_OPT_IN?.toLowerCase() === 'true';
    if (requireOptIn && !input.optIn) {
      throw new Error('WhatsApp opt-in required');
    }

    const from = process.env.TWILIO_FROM;
    if (!from) {
      throw new Error('TWILIO_FROM not set');
    }

    const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
    if (contentSid) {
      const message = await this.getClient().messages.create({
        from: `whatsapp:${from}`,
        to: `whatsapp:${input.to}`,
        contentSid,
        contentVariables: JSON.stringify(input.data ?? {}),
      });

      return message.sid;
    }

    const template = buildTemplate(input.template, input.data);
    const message = await this.getClient().messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${input.to}`,
      body: template.text,
    });

    return message.sid;
  }
}
