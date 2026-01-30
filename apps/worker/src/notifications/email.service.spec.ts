import { EmailService } from './email.service';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(async () => [{ headers: { 'x-message-id': 'msg-123' } }]),
}));

describe('EmailService', () => {
  beforeEach(() => {
    process.env.SENDGRID_API_KEY = 'test-key';
    process.env.SENDGRID_FROM = 'no-reply@test.local';
  });

  it('sends email and returns provider id', async () => {
    const service = new EmailService();

    const result = await service.send({
      to: 'user@test.local',
      template: 'proposal_received',
      data: { protocol: '123', deadlineDays: 7 },
    });

    expect(result).toBe('msg-123');
  });
});
