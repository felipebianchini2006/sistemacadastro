import twilio from 'twilio';
import { buildTemplate } from './templates';
import { NotificationTemplateKey } from './notification.types';

export class SmsService {
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
  }) {
    const from = process.env.TWILIO_SMS_FROM ?? process.env.TWILIO_FROM;
    if (!from) {
      throw new Error('TWILIO_SMS_FROM not set');
    }

    const template = buildTemplate(input.template, input.data);
    const message = await this.getClient().messages.create({
      from,
      to: input.to,
      body: template.text,
    });

    return message.sid;
  }
}
