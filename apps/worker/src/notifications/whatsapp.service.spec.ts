export {};

const createMock = jest.fn(async () => ({ sid: 'wa-123' }));

jest.mock('twilio', () => {
  return jest.fn(() => ({ messages: { create: createMock } }));
});

const { WhatsappService } = require('./whatsapp.service');

describe('WhatsappService', () => {
  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = 'AC1234567890';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_FROM = '+5511999999999';
    delete process.env.TWILIO_WHATSAPP_CONTENT_SID;
  });

  it('sends whatsapp and returns sid', async () => {
    const service = new WhatsappService();
    const result = await service.send({
      to: '+5511988888888',
      template: 'proposal_approved',
      data: { signatureLink: 'https://example.com' },
    });

    expect(result).toBe('wa-123');
    expect(createMock).toHaveBeenCalled();
  });
});
