import { OcrWorker } from './ocr/ocr.worker';
import { SignatureWorker } from './signature/signature.worker';
import { NotificationWorker } from './notifications/notification.worker';

const ocrWorker = new OcrWorker();
const signatureWorker = new SignatureWorker();
const notificationWorker = new NotificationWorker();

const shutdown = async () => {
  await ocrWorker.shutdown();
  await signatureWorker.shutdown();
  await notificationWorker.shutdown();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.info('Workers started');
