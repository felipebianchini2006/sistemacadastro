export {};

const createMock = jest.fn(async () => ({ sid: 'sms-123' }));

jest.mock('twilio', () => {
  return jest.fn(() => ({ messages: { create: createMock } }));
});

const { SmsService } = require('./sms.service');

describe('SmsService', () => {
  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = 'AC1234567890';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_SMS_FROM = '+5511999999999';
  });

  it('sends sms and returns sid', async () => {
    const service = new SmsService();
    const result = await service.send({
      to: '+5511988888888',
      template: 'proposal_received',
      data: { protocol: '123', deadlineDays: 7 },
    });

    expect(result).toBe('sms-123');
    expect(createMock).toHaveBeenCalled();
  });
});
