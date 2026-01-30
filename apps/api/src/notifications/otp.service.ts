import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class OtpService {
  private client?: ReturnType<typeof twilio>;
  private serviceSid?: string;

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(input: { to: string; channel: 'sms' | 'whatsapp' }) {
    const client = this.getClient();
    const serviceSid = this.getServiceSid();

    return client.verify.v2.services(serviceSid).verifications.create({
      to: input.to,
      channel: input.channel,
    });
  }

  async verifyOtp(input: { to: string; code: string }) {
    const client = this.getClient();
    const serviceSid = this.getServiceSid();

    return client.verify.v2.services(serviceSid).verificationChecks.create({
      to: input.to,
      code: input.code,
    });
  }

  private getClient() {
    if (!this.client) {
      const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', {
        infer: true,
      });
      const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', {
        infer: true,
      });

      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not set');
      }

      this.client = twilio(accountSid, authToken);
    }

    return this.client;
  }

  private getServiceSid() {
    if (!this.serviceSid) {
      const serviceSid = this.configService.get<string>(
        'TWILIO_VERIFY_SERVICE_SID',
        { infer: true },
      );
      if (!serviceSid) {
        throw new Error('TWILIO_VERIFY_SERVICE_SID not set');
      }
      this.serviceSid = serviceSid;
    }

    return this.serviceSid;
  }
}
